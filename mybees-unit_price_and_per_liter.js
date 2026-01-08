// ==UserScript==
// @name         Bees Calculator Pro (V9 Math Fix - Audit)
// @namespace    http://innovfly.com/
// @version      9.1
// @description  Calculadora com correção de arredondamento e auditoria de ofertas
// @author       Innovfly
// @match        *://*.mybees.com.br/*
// @match        *://*.mercadolivre.com.br/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURAÇÃO ---
    // Coloque sua chave PIX aqui se for distribuir no futuro
    const CHAVE_PIX = "SUA_CHAVE_PIX_AQUI";
    const INTERVALO = 1000;
    const MARGEM_ERRO = 0.05; // Tolerância de 5 centavos para pegar arredondamentos do site

    // --- ESTILOS VISUAIS (CSS) ---
    const style = document.createElement('style');
    style.innerHTML = `
        .innovfly-box {
            font-family: 'Segoe UI', Roboto, sans-serif; font-size: 11px;
            color: #333; background: linear-gradient(to bottom, #f1f8e9, #ffffff);
            /* Borda ajustada para 1px conforme sua preferência */
            border: 1px solid #8bc34a; border-left: 1px solid #2e7d32;
            border-radius: 4px; padding: 6px 8px; margin-top: 5px;
            width: fit-content; min-width: 140px;
            box-shadow: 0 3px 6px rgba(0,0,0,0.1); line-height: 1.4;
            display: flex; flex-direction: column; z-index: 9999;
            animation: innovFadeIn 0.3s ease-out;
        }
        @keyframes innovFadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .innov-row { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 3px; }
        .innov-header { border-bottom: 1px dashed #a5d6a7; margin-bottom: 4px; padding-bottom: 2px; color: #2e7d32; font-weight: 700; }
        .innov-label { color: #555; }
        .innov-val { font-weight: 600; color: #1b5e20; }

        /* Estilo do botão (oculto por padrão no HTML, mas mantido no CSS caso precise ativar) */
        .innov-donate {
            margin-top: 6px; padding-top: 5px; border-top: 1px solid #eee;
            text-align: center; cursor: pointer; color: #757575; font-size: 10px; font-weight: 500;
            transition: all 0.2s;
        }
        .innov-donate:hover { color: #2e7d32; background-color: #e8f5e9; border-radius: 2px; }
    `;
    document.head.appendChild(style);

    function parseMoney(str) {
        if (!str) return 0;
        let match = str.match(/[\d\.,]+/);
        if (!match) return 0;
        let clean = match[0];
        if (clean.includes(',') && clean.includes('.')) clean = clean.replace(/\./g, '').replace(',', '.');
        else if (clean.includes(',')) clean = clean.replace(',', '.');
        return parseFloat(clean);
    }

    // Função que verifica se o preço do vizinho bate matematicamente com o nosso cálculo
    function marcarRedundanciaLocal(container, valorUnitarioCalculado) {
        if (!container) return;
        let possiveisRedundantes = container.querySelectorAll('*');

        possiveisRedundantes.forEach(el => {
            if (el.children.length > 0) return;
            if (el.getAttribute('data-innov-parsed')) return;

            let texto = el.innerText;
            if (!texto || !texto.includes('R$')) return;

            let precoVizinho = parseMoney(texto);
            if (precoVizinho <= 0) return;

            // Lógica Matemática V9: Se a diferença for menor que 5 centavos, é redundante.
            // Se a diferença for GRANDE (ex: site mostra 5,33 e real é 4,90), ele NÃO entra aqui e exibe a caixa (Audit).
            if (Math.abs(precoVizinho - valorUnitarioCalculado) < MARGEM_ERRO) {
                 el.setAttribute('data-innov-parsed', 'true');
            }
        });
    }

    window.copiarPix = function(e) {
        e.preventDefault(); e.stopPropagation();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(CHAVE_PIX)
                .then(() => alert("✅ Chave PIX copiada!"))
                .catch(() => prompt("Copie:", CHAVE_PIX));
        } else { prompt("Copie:", CHAVE_PIX); }
    };

    function run() {
        let xpath = "//*[contains(text(), 'R$')]";
        let snapshots = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

        for (let i = 0; i < snapshots.snapshotLength; i++) {
            let el = snapshots.snapshotItem(i);

            if (el.getAttribute('data-innov-parsed')) continue;
            if (el.closest('.innovfly-box')) continue;

            const style = window.getComputedStyle(el);
            if (style.textDecorationLine.includes('line-through')) continue;

            // Segurança extra: se tiver barra explícita (/un), ignora
            if (el.innerText.includes('/')) {
                el.setAttribute('data-innov-parsed', 'true');
                continue;
            }

            let price = parseMoney(el.innerText);
            if (price <= 0) continue;

            // Busca contexto (Card do Produto)
            let tempParent = el.parentElement;
            let containerCard = null;
            let fullText = "";
            for (let k = 0; k < 6; k++) {
                if (!tempParent) break;
                fullText += " " + tempParent.innerText;
                if (k === 4) containerCard = tempParent;
                tempParent = tempParent.parentElement;
            }
            fullText = fullText.toLowerCase().replace(/\n/g, ' ');

            // Extração Qtd
            let qtd = 1;
            let mQtd = fullText.match(/(?:c\/|x|cx|caixa|pack|fardo|contém|com)\s?[:]?\s?(\d+)|(\d+)\s?(un|uni|garrafas|latas)/i);
            if (mQtd) qtd = parseFloat(mQtd[1] || mQtd[2]);

            // Se for unitário (1 un), pula (a menos que tenha volume, mas focado em caixas)
            if (qtd <= 1) {
                if (!fullText.match(/(\d+[\.,]?\d*)\s?(ml|l|kg|g)\b/i)) continue;
            }

            // Verifica redundância matemática
            if (qtd > 1) {
                let unitarioReal = price / qtd;
                if (containerCard) marcarRedundanciaLocal(containerCard, unitarioReal);
            }

            // Extração Volume
            let vol = 0;
            let unit = 'L';
            let volDisplay = '';
            let mVol = fullText.match(/(\d+[\.,]?\d*)\s?(ml|l|kg|g)\b/i);
            if (mVol) {
                let val = parseFloat(mVol[1].replace(',', '.'));
                let u = mVol[2];
                if (u === 'ml') { vol = val/1000; unit='L'; volDisplay = val+'ml'; }
                else if (u === 'l') { vol = val; unit='L'; volDisplay = val+'L'; }
                else if (u === 'g') { vol = val/1000; unit='kg'; volDisplay = val+'g'; }
                else if (u === 'kg') { vol = val; unit='kg'; volDisplay = val+'kg'; }
            }

            if (qtd === 1 && vol === 0) continue;

            // Renderiza HTML
            let html = `<div class="innov-row innov-header"><span>Base:</span><span>R$ ${price.toFixed(2)}</span></div>`;

            if (qtd > 1) {
                html += `
                <div class="innov-row"><span class="innov-label">Qtd Pack:</span><span class="innov-val">${qtd} un</span></div>
                <div class="innov-row"><span class="innov-label">Unidade:</span><span class="innov-val">R$ ${(price/qtd).toFixed(2)}</span></div>
                `;
            }

            if (vol > 0) {
                let totalVol = vol * qtd;
                html += `
                <div class="innov-row"><span class="innov-label">Vol. Un:</span><span class="innov-val">${volDisplay}</span></div>
                <div class="innov-row"><span class="innov-label">${unit === 'L' ? 'Litro' : 'Quilo'}:</span><span class="innov-val">R$ ${(price/totalVol).toFixed(2)}</span></div>
                `;
            }

            // Botão de doação COMENTADO para uso pessoal
            // html += `<div class="innov-donate" onclick="window.copiarPix(event)">☕ Pagar um café (PIX)</div>`;

            let box = document.createElement('div');
            box.className = 'innovfly-box';
            box.innerHTML = html;

            el.setAttribute('data-innov-parsed', 'true');
            if (el.parentNode) el.parentNode.insertBefore(box, el.nextSibling);
        }
    }

    setInterval(run, INTERVALO);
})();

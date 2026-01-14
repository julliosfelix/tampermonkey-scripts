// ==UserScript==
// @name         Bees Calculator Pro (V10.2 Final Audit)
// @namespace    http://innovfly.com/
// @version      10.2
// @description  Calculadora de Combos com auditoria, lógica 24un e botão de fechar manual
// @author       Innovfly & Gemini Partner
// @match        *://*.mybees.com.br/*
// @match        *://*.mercadolivre.com.br/*
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    // --- CONFIGURAÇÃO ---
    const CHAVE_PIX = "SUA_CHAVE_PIX_AQUI"; // Opcional
    const INTERVALO = 1000;
    const ITENS_POR_CAIXA_FIXO = 24; // Risco assumido pelo usuário para Combos
    const MARGEM_ERRO = 0.05; // Tolerância para evitar redundância em preços já calculados

    // --- ESTILOS VISUAIS (CSS) ---
    const style = document.createElement('style');
    style.innerHTML = `
        .innovfly-box {
            position: relative; /* Necessário para posicionar o X */
            font-family: 'Segoe UI', Roboto, sans-serif; font-size: 11px;
            color: #333; background: linear-gradient(to bottom, #f1f8e9, #ffffff);
            border: 1px solid #8bc34a;
            border-left: 3px solid #2e7d32;
            border-radius: 4px; padding: 6px 8px; margin-top: 5px;
            width: fit-content; min-width: 150px;
            box-shadow: 0 3px 6px rgba(0,0,0,0.1);
            line-height: 1.4;
            display: flex; flex-direction: column; z-index: 9999;
            animation: innovFadeIn 0.3s ease-out;
        }
        @keyframes innovFadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        /* Botão Fechar Discreto */
        .innov-close {
            position: absolute; top: 2px; right: 5px;
            cursor: pointer; color: #999; font-weight: bold;
            font-size: 10px; line-height: 1; padding: 2px;
            z-index: 100;
        }
        .innov-close:hover { color: #d32f2f; }

        .innov-row { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 2px; }
        .innov-header { border-bottom: 1px dashed #a5d6a7; margin-bottom: 4px; padding-bottom: 2px; color: #2e7d32; font-weight: 700; margin-right: 10px; }
        .innov-label { color: #666; font-size: 10px; }
        .innov-val { font-weight: 600; color: #1b5e20; }
        .innov-strike { text-decoration: line-through; color: #999; font-size: 10px; }
        .innov-discount { color: #e65100; font-weight: bold; }
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
            if (Math.abs(precoVizinho - valorUnitarioCalculado) < MARGEM_ERRO) {
                 el.setAttribute('data-innov-parsed', 'true');
             }
        });
    }

    function findOldPrice(container, currentPrice) {
        if (!container) return 0;
        let text = container.innerText;
        let moneyMatches = text.match(/R\$\s?[\d\.,]+/g);
        if (!moneyMatches) return 0;
        let maxPrice = 0;
        moneyMatches.forEach(m => {
            let val = parseMoney(m);
            if (val > maxPrice) maxPrice = val;
        });
        if (maxPrice > currentPrice * 1.01) return maxPrice;
        return 0;
    }

    function run() {
        let xpath = "//*[contains(text(), 'R$')]";
        let snapshots = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

        for (let i = 0; i < snapshots.snapshotLength; i++) {
            let el = snapshots.snapshotItem(i);
            if (el.getAttribute('data-innov-parsed')) continue;
            if (el.closest('.innovfly-box')) continue;

            const styleComp = window.getComputedStyle(el);
            if (styleComp.textDecorationLine.includes('line-through')) continue;

            let price = parseMoney(el.innerText);
            if (price <= 0) continue;

            // --- Contexto ---
            let tempParent = el.parentElement;
            let containerCard = null;
            let fullText = "";
            for (let k = 0; k < 6; k++) {
                if (!tempParent) break;
                fullText += " " + tempParent.innerText;
                if (k === 4) containerCard = tempParent;
                tempParent = tempParent.parentElement;
            }
            if (!containerCard) containerCard = el.parentElement.parentElement;
            fullText = fullText.toLowerCase().replace(/\n/g, ' ');

            // --- Lógica de Extração ---
            let qtdCaixas = 1;
            let isCombo = false;

            let mCombo = fullText.match(/combo\s+(\d+)/i);
            if (mCombo) {
                qtdCaixas = parseInt(mCombo[1]);
                isCombo = true;
            } else {
                let mQtd = fullText.match(/(?:c\/|x|cx|caixa|pack|fardo|contém|com)\s?[:]?\s?(\d+)|(\d+)\s?(un|uni|garrafas|latas)/i);
                if (mQtd) {
                    let found = parseFloat(mQtd[1] || mQtd[2]);
                    if (found < 50) qtdCaixas = found;
                }
            }

            // --- Redundância ---
            if (qtdCaixas > 1) {
                let unitarioReal = price / qtdCaixas;
                if (containerCard) marcarRedundanciaLocal(containerCard, unitarioReal);
            }

            if (qtdCaixas <= 1 && !isCombo) continue;

            // --- Renderização HTML ---
            let html = `<div class="innov-row innov-header"><span>Oferta:</span><span>R$ ${price.toFixed(2)}</span></div>`;

            let oldPrice = findOldPrice(containerCard, price);
            if (oldPrice > 0) {
                let diff = oldPrice - price;
                let pct = (diff / oldPrice) * 100;
                html += `
                <div class="innov-row">
                    <span class="innov-label">Era (Tabela):</span>
                    <span class="innov-strike">R$ ${oldPrice.toFixed(2)}</span>
                </div>
                <div class="innov-row">
                    <span class="innov-label">Desc. Real:</span>
                    <span class="innov-val innov-discount">${pct.toFixed(2)}%</span>
                </div>
                <div style="border-bottom: 1px solid #eee; margin: 3px 0;"></div>
                `;
            }

            if (isCombo) {
                let precoPorCaixa = price / qtdCaixas;
                let totalGarrafas = qtdCaixas * ITENS_POR_CAIXA_FIXO;
                let precoPorGarrafa = price / totalGarrafas;
                html += `
                <div class="innov-row"><span class="innov-label">Cx Combo (${qtdCaixas}):</span><span class="innov-val">R$ ${precoPorCaixa.toFixed(2)}</span></div>
                <div class="innov-row"><span class="innov-label">Total Garrafas:</span><span class="innov-val">${totalGarrafas} un</span></div>
                <div class="innov-row"><span class="innov-label">Preço Garrafa:</span><span class="innov-val" style="background:#e8f5e9; padding:0 2px;">R$ ${precoPorGarrafa.toFixed(2)}</span></div>
                `;
            } else if (qtdCaixas > 1) {
                html += `
                <div class="innov-row"><span class="innov-label">Qtd Pack:</span><span class="innov-val">${qtdCaixas} un</span></div>
                <div class="innov-row"><span class="innov-label">Unidade:</span><span class="innov-val">R$ ${(price/qtdCaixas).toFixed(2)}</span></div>
                `;
            }

            // Cria Elemento
            let box = document.createElement('div');
            box.className = 'innovfly-box';

            // Adiciona o X de fechar manualmente antes do conteúdo
            box.innerHTML = `<span class="innov-close" title="Remover cálculo">✕</span>` + html;

            // Adiciona evento de clique para remover a caixa
            let closeBtn = box.querySelector('.innov-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    box.remove();
                });
            }

            el.setAttribute('data-innov-parsed', 'true');
            if (el.parentNode) el.parentNode.insertBefore(box, el.nextSibling);
        }
    }

    setInterval(run, INTERVALO);
})();

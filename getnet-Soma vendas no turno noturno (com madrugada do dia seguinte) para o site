// ==UserScript==
// @name         getnet-Soma vendas no turno noturno (com madrugada do dia seguinte) para o site
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Soma Bruto Aprovado lendo os cards de data (17 Dez, 18 Dez)
// @author       Gemini
// @match        *://minhaconta.getnet.com.br/historico-vendas/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    let totalCredito = 0;
    let totalDebito = 0;
    let vendasID = new Set();
    let dataTurnoIniciado = "";

    function criarPainel() {
        if (document.getElementById('painel-soma-getnet')) return;
        const panel = document.createElement('div');
        panel.id = 'painel-soma-getnet';
        panel.style = "position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 9999999; background: #111; color: #fff; padding: 12px 25px; border: 2px solid #e30613; border-radius: 15px 15px 0 0; box-shadow: 0 -4px 20px rgba(0,0,0,0.8); font-family: sans-serif; display: flex; gap: 20px; align-items: center;";
        panel.innerHTML = `
            <div style="text-align: center; border-right: 1px solid #444; padding-right: 15px;">
                <div style="font-size: 9px; color: #ffca00; margin-bottom: 4px;">TURNO INICIADO EM:</div>
                <div id="data-turno" style="font-size: 11px; font-weight: bold; color: #fff; margin-bottom: 4px;">---</div>
                <button id="btn-zerar" style="cursor:pointer; background:#444; color:#fff; border:none; font-size:9px; padding:2px 6px; border-radius:3px;">ZERAR CAIXA</button>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 9px; color: #aaa;">CRÉDITO (B)</div>
                <div id="valor-credito" style="font-size: 22px; font-weight: bold; color: #00d4ff;">R$ 0,00</div>
                <button id="copy-credito" style="cursor:pointer; background:#333; color:white; border:none; font-size:10px; padding:3px 10px; border-radius:2px;">Copiar</button>
            </div>
            <div style="text-align: center; border-right: 1px solid #444; padding-right: 20px;">
                <div style="font-size: 9px; color: #aaa;">DÉBITO (C)</div>
                <div id="valor-debito" style="font-size: 22px; font-weight: bold; color: #00ff00;">R$ 0,00</div>
                <button id="copy-debito" style="cursor:pointer; background:#333; color:white; border:none; font-size:10px; padding:3px 10px; border-radius:2px;">Copiar</button>
            </div>
            <div style="text-align: center;">
                <button id="btn-calc" style="background:#e30613; color:white; border:none; padding:12px 20px; border-radius:8px; cursor:pointer; font-weight:bold; font-size: 15px;">➕ SOMAR TELA</button>
                <div id="msg-calc" style="font-size: 10px; color: #ffca00; height: 12px; margin-top: 4px;"></div>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById('btn-calc').onclick = somarVisiveis;
        document.getElementById('btn-zerar').onclick = () => {
            totalCredito = 0; totalDebito = 0; vendasID.clear(); dataTurnoIniciado = "";
            document.getElementById('data-turno').innerText = '---';
            atualizarDisplay();
        };
        document.getElementById('copy-debito').onclick = () => copiar('valor-debito');
        document.getElementById('copy-credito').onclick = () => copiar('valor-credito');
    }

    function copiar(id) {
        navigator.clipboard.writeText(document.getElementById(id).innerText.replace('R$ ', ''));
    }

    function atualizarDisplay() {
        document.getElementById('valor-debito').innerText = totalDebito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('valor-credito').innerText = totalCredito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function somarVisiveis() {
        // Detectar a data base através dos cards que você enviou
        const cards = document.querySelectorAll('.card-custom');
        let diasNoSite = [];

        cards.forEach(card => {
            const diaElement = card.querySelector('.day');
            const mesElement = card.querySelector('.month');
            if (diaElement && mesElement) {
                const d = parseInt(diaElement.innerText);
                const mStr = mesElement.innerText.toLowerCase();
                const m = mStr.includes('dez') ? 11 : 0; // Ajuste para Dezembro (JS meses 0-11)
                diasNoSite.push({dia: d, mes: m});
            }
        });

        // Se encontrou dias nos cards e ainda não definiu a data do turno
        if (diasNoSite.length > 0 && dataTurnoIniciado === "") {
            diasNoSite.sort((a, b) => a.dia - b.dia);
            dataTurnoIniciado = diasNoSite[0]; // Pega o dia menor
            document.getElementById('data-turno').innerText = dataTurnoIniciado.dia + "/" + (dataTurnoIniciado.mes + 1);
        }

        const linhas = document.querySelectorAll('tr, [role="row"]');
        let novas = 0;

        // Intervalo: das 11:00 do dia menor até as 11:00 do dia seguinte
        const inicioTurno = new Date(2025, dataTurnoIniciado.mes, dataTurnoIniciado.dia, 11, 0);
        const fimTurno = new Date(2025, dataTurnoIniciado.mes, dataTurnoIniciado.dia + 1, 11, 0);

        linhas.forEach(linha => {
            const texto = linha.innerText;
            if (texto.includes('Aprovada')) {
                const dataMatch = texto.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/);
                const valores = texto.match(/R\$\s?(\d+\.?\d*,\d{2})/g);

                if (dataMatch && valores) {
                    const [_, data, hora] = dataMatch;
                    const [d, m, y] = data.split('/').map(Number);
                    const [hh, mm] = hora.split(':').map(Number);
                    const dtVenda = new Date(y, m - 1, d, hh, mm);

                    if (dtVenda >= inicioTurno && dtVenda < fimTurno) {
                        const valorBrutoStr = valores[0];
                        const valorNum = parseFloat(valorBrutoStr.replace('R$', '').replace('.', '').replace(',', '.').trim());
                        const idVenda = data + hora + valorBrutoStr + texto.slice(-15);

                        if (!vendasID.has(idVenda)) {
                            if (texto.includes('Débito')) totalDebito += valorNum;
                            else if (texto.includes('Crédito')) totalCredito += valorNum;
                            vendasID.add(idVenda);
                            novas++;
                        }
                    }
                }
            }
        });

        atualizarDisplay();
        const msg = document.getElementById('msg-calc');
        msg.innerText = novas > 0 ? `+${novas} vendas` : 'Sem novas';
        setTimeout(() => { msg.innerText = ''; }, 2000);
    }

    setTimeout(criarPainel, 1500);
})();

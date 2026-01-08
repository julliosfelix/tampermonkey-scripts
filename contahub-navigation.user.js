// ==UserScript==
// @name         Navegação de Turnos (Overlay + Teclado)
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Navegação no topo com Data e atalhos de teclado (Setas Esquerda/Direita).
// @author       Você
// @match        https://sp.contahub.com/rest/contahub.cmds.GerenciaCmd/getRelatorioTurnoHtml/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. Configuração e Links ---
    const urlParams = new URLSearchParams(window.location.search);
    const trnAtual = parseInt(urlParams.get('trn'));
    const empId = urlParams.get('emp');

    if (!trnAtual || !empId) return;

    const baseUrl = window.location.origin + window.location.pathname;
    const linkAnterior = `${baseUrl}?emp=${empId}&trn=${trnAtual - 1}`;
    const linkProximo = `${baseUrl}?emp=${empId}&trn=${trnAtual + 1}`;

    // --- 2. Extração da Data (Visual) ---
    let textoExibicao = `Turno #${trnAtual}`; // Fallback

    const xpath = "//*[contains(text(), 'Resumo de Turno')]";
    const elementoTitulo = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

    if (elementoTitulo) {
        const textoCompleto = elementoTitulo.innerText;
        // Busca padrão: 07-Dez (Dom)
        const matchData = textoCompleto.match(/(\d{2}-[A-Za-zç]+\s\([A-Za-z]+\))/);
        if (matchData && matchData[1]) {
            textoExibicao = matchData[1];
        }
    }

    // --- 3. Criação do Overlay Visual ---
    const container = document.createElement('div');

    // Estilos do container
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '99999';
    container.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    container.style.padding = '8px 25px';
    container.style.borderRadius = '50px';
    container.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    container.style.border = '1px solid #ddd';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '20px';
    container.style.fontFamily = 'Segoe UI, Arial, sans-serif';

    // HTML interno
    container.innerHTML = `
        <a href="${linkAnterior}" id="btnAnterior" style="text-decoration: none; font-size: 24px; cursor: pointer; user-select: none;" title="Anterior (Seta Esquerda)">⬅️</a>
        <span style="font-weight: 700; font-size: 18px; color: #333; min-width: 120px; text-align: center;">${textoExibicao}</span>
        <a href="${linkProximo}" id="btnProximo" style="text-decoration: none; font-size: 24px; cursor: pointer; user-select: none;" title="Próximo (Seta Direita)">➡️</a>
    `;

    document.body.appendChild(container);

    // --- 4. Lógica do Teclado ---
    document.addEventListener('keydown', function(e) {
        // Ignora se o usuário estiver digitando em algum campo de texto (input/textarea)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === "ArrowLeft") {
            // Seta Esquerda -> Vai para o turno anterior
            window.location.href = linkAnterior;
        } else if (e.key === "ArrowRight") {
            // Seta Direita -> Vai para o próximo turno
            window.location.href = linkProximo;
        }
    });

})();

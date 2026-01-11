// ==UserScript==
// @name         ContaHub - Ambiente (Sincronia Imediata)
// @match        https://sp.contahub.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const donosAutorizados = ['aldy@664', 'jullios@664'];
    let ambienteLocal = null;

    const aplicarLayout = (ambiente) => {
        if (ambiente === ambienteLocal) return;
        ambienteLocal = ambiente;

        const header = document.getElementById('mainHeader');
        const btn = document.getElementById('btn-toggle-ambiente');

        if (ambiente == "1") { // PRODUÇÃO
            if (header) {
                header.style.setProperty('background-image', "url('img/fundo-header-neon-azul.jpg')", 'important');
                header.style.backgroundColor = "";
            }
            if (btn) {
                btn.innerText = "PRODUÇÃO";
                btn.style.color = "#287aed"
                btn.style.background = "#264b96";
                btn.style.borderColor = "#287aed"
                btn.style.boxShadow = "none"; // Remove sombras para ficar "flat"
            }
        } else { // HOMOLOGAÇÃO
            if (header) {
                header.style.setProperty('background-image', 'none', 'important');
                header.style.setProperty('background-color', '#ff0000', 'important');
            }
            if (btn) {
                btn.innerText = "HOMOLOGAÇÃO";
                btn.style.background = "#ffc107";
                btn.style.color = "#000000";
            }
        }
    };

    const sincronizarVisual = async () => {
        if (!window.contahub?.u) return;
        try {
            // Verifica o estado real no servidor
            const res = await fetch(`https://sp.contahub.com/rest/contahub.cmds.ConfigCmd/getConfigEmpresa/${Date.now()}?emp=${window.contahub.u.emp}&nfe=1`);
            if (res.ok) {
                const dados = await res.json();
                window.contahub.u.nfe_ambiente = dados.nfe_ambiente;
                aplicarLayout(dados.nfe_ambiente);
            }
        } catch (e) {}
    };

    const salvarNoServidor = async (novoAmbiente) => {
        const u = window.contahub.u;
        const urlBase = `https://sp.contahub.com/rest/contahub.cmds.ConfigCmd`;

        try {
            const res = await fetch(`${urlBase}/getConfigEmpresa/${Date.now()}?emp=${u.emp}&nfe=1`);
            const dados = await res.json();
            dados.nfe_ambiente = novoAmbiente;

            const bodyEncoded = new URLSearchParams(dados).toString();
            const saveRes = await fetch(`${urlBase}/setConfigEmpresa/${Date.now()}?emp=${u.emp}&nfe=1`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                body: bodyEncoded
            });

            if (saveRes.ok) {
                window.contahub.u.nfe_ambiente = novoAmbiente;
                aplicarLayout(novoAmbiente);
            }
        } catch (e) { console.error("Erro ao salvar", e); }
    };

    const iniciar = () => {
        const u = window.contahub.u;
        if (!u) return;

        if (donosAutorizados.includes(u.usr_email) && !document.getElementById('btn-toggle-ambiente')) {
            const container = document.createElement('div');
            container.style = "position: fixed; top: 7px; left: 50%; transform: translateX(-50%); z-index: 10000;";

            const btn = document.createElement('button');
            btn.id = 'btn-toggle-ambiente';
            btn.style = "color: white; border: 1px solid white; padding: 4px 12px; cursor: pointer; border-radius: 15px; font-weight: bold; font-size: 10px; text-shadow: none;";

            btn.onclick = () => {
                const novo = (ambienteLocal == "1") ? "2" : "1";
                btn.innerText = "Salvando...";
                salvarNoServidor(novo);
            };

            container.appendChild(btn);
            document.body.appendChild(container);
        }

        // 1. Sincroniza IMEDIATAMENTE ao carregar a página
        sincronizarVisual();

        // 2. Mantém a verificação periódica de 10s para outros terminais
        setInterval(() => {
            if (!document.hidden) sincronizarVisual();
        }, 10000);
    };

    const check = setInterval(() => {
        if (window.contahub?.u) {
            iniciar();
            clearInterval(check);
        }
    }, 500);
})();

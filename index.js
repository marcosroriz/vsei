#!/usr/bin/env node

// Bibliotecas Node
const puppeteer = require('puppeteer');
const argv = require('minimist')(process.argv.slice(2));
const Table = require('cli-table');

// console.log(argv);

// Nossos Módulos
const CREDS = require('./creds.js');
const NDE = require("./nde.js");
const { membros } = require('./nde.js');

// Campos do SEI
const USERNAME_SELECTOR = "#txtUsuario";
const PASSWORD_SELECTOR = "#pwdSenha";
const BUTTON_SELECTOR = "#sbmLogin";
const SEARCH_SELECTOR = "#txtPesquisaRapida";

// Variavéis globais
var browser;
var page;
const WAIT_PERIOD = 1000;

async function login(username, password) {
    // Preenchendo dados de login
    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(username);
    await page.waitFor(WAIT_PERIOD);
    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(password);
    await page.waitFor(WAIT_PERIOD);

    // Clicar em login
    await page.click(BUTTON_SELECTOR);
    return await page.waitForNavigation();
}


async function buscarProcesso(numProcesso) {
    await page.waitFor(WAIT_PERIOD * 3);
    await page.click(SEARCH_SELECTOR);
    await page.keyboard.type(numProcesso);
    await page.waitFor(WAIT_PERIOD);
    await page.keyboard.press('Enter');
    return await page.waitForNavigation();
}


async function descobrirAtas() {
    let iframe;
    for (const frame of page.mainFrame().childFrames()) {
        if (frame.name() == "ifrArvore") {
            iframe = frame;
            break;
        }
    }

    return await iframe.evaluate(() => {
        var data = {};
        $("#frmArvore > div > div a[target='ifrVisualizacao']").each((_, v) => {
            let treespan = $(v).find('span');
            if (treespan.length == 1) {
                let title = treespan.attr('title').toLowerCase();
                if (title.includes('ata') && !(title.includes('envio')) && !(title.includes('mail'))) {
                    data[treespan.attr('title')] = v.id;
                }
            }
        })
        return JSON.stringify(data);
    });
}


async function buscarAta(linkID) {
    let iframe;
    for (const frame of page.mainFrame().childFrames()) {
        if (frame.name() == "ifrArvore") {
            iframe = frame;
            break;
        }
    }

    await iframe.click(linkID);
    return await page.waitFor(WAIT_PERIOD);
}


async function pegarTextoAssinaturas() {
    await page.waitFor(WAIT_PERIOD);
    let iframe;
    for (const frame of page.mainFrame().childFrames()) {
        if (frame.name() == "ifrVisualizacao") {
            iframe = frame;
            break;
        }
    }

    return await iframe.evaluate(() => {
        var data = [];
        $("#ifrArvoreHtml").contents().find("table").find("b").each((_, v) => {
            data.push(v.innerHTML)
        })
        return JSON.stringify(data);
    });
}


function pegarAssinaturasValidas(txtAssinaturas, validas) {
    let assinaturas = [];
    txtAssinaturas.forEach((i) => {
        if (validas.includes(i)) {
            assinaturas.push(i);
        }
    })

    return assinaturas;
}


async function run() {
    browser = await puppeteer.launch({ headless: false });
    page = await browser.newPage();

    await page.goto('https://sei.ufg.br/');
    await login(CREDS.username, CREDS.password);
    await buscarProcesso("23070.026856/2020-39");
    let ataMap = JSON.parse(await descobrirAtas());

    // Vamos preparar a tabela onde colocaremos os resultados
    var numAtas = Object.keys(ataMap).length;
    var tblHeader = new Array(numAtas + 1);
    tblHeader[0] = "Membros";
    tblAssinaturas = {}
    NDE.membros.forEach((m) => {
        dadosMembro = new Array(numAtas + 1)
        dadosMembro[0] = m;
        tblAssinaturas[m] = dadosMembro;
    })

    // Ok, agora vamos buscar cada ata
    let i = 1;
    for (const [nomeAta, idAta] of Object.entries(ataMap)) {
        tblHeader[i] = nomeAta.split("(")[0];
        buscarAta("#" + idAta);

        let txtAssinaturas = JSON.parse(await pegarTextoAssinaturas());
        let assinaturasValidas = pegarAssinaturasValidas(txtAssinaturas, NDE.membros);

        assinaturasValidas.forEach((membro) => {
            tblAssinaturas[membro][i] = "✓";
        })

        i = i + 1;
    }

    // Por fim, vamos imprimir o
    tblSaida = new Table({ head: tblHeader })
    NDE.membros.forEach((m) => {
        tblSaida.push(tblAssinaturas[m])
    })
    console.log(tblSaida.toString());
    // Promise.resolve()
    await page.close()

}

run();

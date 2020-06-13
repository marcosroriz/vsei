#!/usr/bin/env node

// Bibliotecas Node
const puppeteer = require('puppeteer');
const argv = require('minimist')(process.argv.slice(2));
console.log(argv);

// Nossos Módulos
const CREDS = require('./creds.js');
const NDE = require("./nde.js")

// Campos do SEI
const USERNAME_SELECTOR = "#txtUsuario";
const PASSWORD_SELECTOR = "#pwdSenha";
const BUTTON_SELECTOR = "#sbmLogin";
const SEARCH_SELECTOR = "#txtPesquisaRapida";

// Variavéis globais
var browser;
var page;


async function login(username, password) {
    // Preenchendo dados de login
    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(username);
    await page.waitFor(1000);
    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(password);
    await page.waitFor(1000);

    // Clicar em login
    await page.click(BUTTON_SELECTOR);
    return await page.waitForNavigation();
}

async function buscarProcesso(numProcesso) {
    await page.waitFor(1000);
    await page.click(SEARCH_SELECTOR);
    await page.keyboard.type(numProcesso);
    await page.waitFor(1000);
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
        $("#frmArvore > div > div a[target='ifrVisualizacao']").each((k, v) => {
            let treespan = $(v).find('span');
            if (treespan.length == 1) {
                if (treespan.attr('title').toLowerCase().includes('ata') &&
                    !(treespan.attr('title').toLowerCase().includes('envio'))) {
                    data[treespan.attr('title')] = v.id
                }
            }
        })
        return JSON.stringify(data);
    });
}

async function run() {
    browser = await puppeteer.launch({ headless: false });
    page = await browser.newPage();

    await page.goto('https://sei.ufg.br/');
    await login(CREDS.username, CREDS.password);
    await buscarProcesso("23070.026856/2020-39");
    let ataMap = await descobrirAtas();
    console.log(ataMap);

    // // browser.close();
}

run();

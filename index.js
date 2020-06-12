#!/usr/bin/env node

// Bibliotecas Node
const puppeteer = require('puppeteer');

// Nossas Bibliotecas
const CREDS = require('./creds');

// Campos do SEI
const USERNAME_SELECTOR = "#txtUsuario";
const PASSWORD_SELECTOR = "#pwdSenha";
const BUTTON_SELECTOR = "#sbmLogin";


async function run() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://sei.ufg.br/');

    // Preenchendo dados login
    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(CREDS.username);
    await page.waitFor(1000);
    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(CREDS.password);
    await page.waitFor(1000);

    // Login
    
    await page.screenshot({ path: 'screenshots/github.png' });
    await page.click(BUTTON_SELECTOR);
    await page.waitForNavigation();
    // browser.close();
}

run();

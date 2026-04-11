import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

const constants = readFileSync('./src/config/constants.js', 'utf8');
const version = constants.match(/SCRIPT_VERSION\s*=\s*"([^"]+)"/)?.[1] ?? '0.0';

const banner = `// ==UserScript==
// @name         CreditRadar 📶
// @namespace    http://tampermonkey.net/
// @version      ${version}
// @description  Organizador inteligente de disputes - clasifica colecciones, acreedores, inquiries e información personal automáticamente
// @author       MAnuelbis Encarnacion Abreu  
// @match        https://pulse.disputeprocess.com/*
// @match        https://manuelbis1996.github.io/CreditRadar-/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      raw.githubusercontent.com
// @grant        GM_xmlhttpRequest
// @updateURL    https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js
// @downloadURL  https://raw.githubusercontent.com/manuelbis1996/CreditRadar-/main/creditradar.user.js
// ==/UserScript==
`;

export default {
  input: 'src/main.js',
  output: {
    file: 'creditradar.user.js',
    format: 'iife', 
    banner: banner
  },
  plugins: [
    resolve(),
    commonjs()
    // terser() // We can optionally minify, but for now we leave it readable
  ]
};

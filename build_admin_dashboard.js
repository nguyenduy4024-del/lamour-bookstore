const fs = require('fs');
const path = require('path');

const headCss = require('./admin_parts/head_css');
const sidebar = require('./admin_parts/sidebar');
const panels1 = require('./admin_parts/panels_group1');
const panels2 = require('./admin_parts/panels_group2');
const panels3 = require('./admin_parts/panels_group3');
const panels4 = require('./admin_parts/panels_group4');
const panels5 = require('./admin_parts/panels_group5');
const panels6 = require('./admin_parts/panels_group6');
const modals = require('./admin_parts/modals');
const scripts = require('./admin_parts/scripts');

const appClosing = `
  </main>
</div>
`;

const fullHtml = [
  headCss,
  sidebar,
  panels1,
  panels2,
  panels3,
  panels4,
  panels5,
  panels6,
  appClosing,
  modals,
  scripts
].join('\n');

const targetPath = path.join(__dirname, 'views', 'admin-dashboard.html');
fs.writeFileSync(targetPath, fullHtml, 'utf8');
console.log('Successfully generated Enterprise Admin Portal at:', targetPath);
console.log('File size in bytes:', fs.statSync(targetPath).size);

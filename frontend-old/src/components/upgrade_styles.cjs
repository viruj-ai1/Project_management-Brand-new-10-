const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'RDProjectsView.tsx',
  'ProjectTimelinesView.tsx',
  'EmployeeWorkspace.tsx',
  'PMProjectsView.tsx'
];

const componentsDir = __dirname;

filesToUpdate.forEach(file => {
  const filePath = path.join(componentsDir, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Colors
  content = content.replace(/indigo/g, 'blue');
  content = content.replace(/teal/g, 'emerald');
  content = content.replace(/slate/g, 'gray');
  
  // Specific premium branding
  content = content.replace(/bg-blue-600/g, 'bg-[#1e3a5f]');
  content = content.replace(/hover:bg-blue-700/g, 'hover:bg-[#162d4a]');
  
  // Structural/Aesthetic Upgrades
  // Upgrade basic cards to premium style
  content = content.replace(/bg-white rounded-xl border border-gray-200/g, 'bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200');
  content = content.replace(/bg-white rounded-lg border border-gray-200/g, 'bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md');
  
  // Headings
  content = content.replace(/text-2xl font-bold text-gray-800/g, 'text-2xl font-bold text-gray-900 tracking-tight');
  content = content.replace(/text-xl font-bold text-gray-800/g, 'text-xl font-bold text-gray-900 tracking-tight');
  
  // Empty states
  content = content.replace(/border-dashed border-gray-300/g, 'border-2 border-dashed border-gray-200 bg-gray-50/50');
  
  // Add fade-in to root if possible (naive approach: add to first div)
  if (!content.includes('fade-in')) {
    content = content.replace(/className="space-y-6"/, 'className="space-y-8 fade-in"');
    content = content.replace(/className="space-y-4"/, 'className="space-y-6 fade-in"');
  }

  // General refinements
  content = content.replace(/text-gray-800/g, 'text-gray-900');
  content = content.replace(/shadow-md/g, 'shadow-sm hover:shadow-md transition-shadow');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});

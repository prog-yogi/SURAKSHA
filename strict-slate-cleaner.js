const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'src/app/dashboard/user/page.tsx'),
  path.join(__dirname, 'src/app/dashboard/admin/page.tsx')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Strip "bg-white" entirely
  content = content.replace(/\bbg-white\b/g, '');
  
  // Make "dark:bg-..." just "bg-..."
  content = content.replace(/dark:bg-\[#131B2B\]/g, 'bg-[#131B2B]');
  content = content.replace(/dark:bg-\[#0B0F19\]/g, 'bg-[#0B0F19]');
  
  // Clean up broken leftovers
  content = content.replace(/dark:drop-\s*/g, '');
  content = content.replace(/dark:\s*/g, '');
  content = content.replace(/dark:drop-shadow-[a-zA-Z0-9-]+\s*/g, '');
  
  // Fix double borders/rounded issues injected by previous script
  content = content.replace(/rounded-2xl border border-\[#2A303C\]\s+bg-\[#131B2B\]\s+p-6\s+rounded-2xl border border-\[#2A303C\]/g, 'rounded-2xl border border-[#2A303C] bg-[#131B2B] p-6');

  // Fix ActionCard duplicate borders
  content = content.replace(/rounded-xl border border-\[#2A303C\] bg-zinc-50 bg-\[#1a1a1e\]/g, 'rounded-xl border border-[#2A303C] bg-[#131B2B]');

  // Fix StatCard generic bg
  content = content.replace(/bg-slate-900\/40\s+backdrop-blur/g, 'bg-[#131B2B] border border-[#2A303C]');

  // Fix other bg overlaps
  content = content.replace(/bg-zinc-50\s+bg-\[#1a1a1e\]/g, 'bg-[#131B2B]');
  content = content.replace(/bg-zinc-100\s+bg-\[#1a1a1e\]/g, 'bg-[#0B0F19]');

  // Any remaining generic background that shouldn't be there
  content = content.replace(/bg-zinc-50/g, 'bg-[#0B0F19]');
  content = content.replace(/bg-slate-100/g, 'bg-[#0B0F19]');

  fs.writeFileSync(file, content);
  console.log(`Cleaned ${file}`);
}

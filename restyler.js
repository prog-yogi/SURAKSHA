const fs = require('fs');
const path = require('path');

const userFile = path.join(__dirname, 'src/app/dashboard/user/page.tsx');
if (fs.existsSync(userFile)) {
  let content = fs.readFileSync(userFile, 'utf8');

  // Aesthetic replacements to match the new dark theme
  content = content.replace(/bg-white dark:bg-slate-900\/60 backdrop-blur-xl p-6 shadow-sm dark:shadow-2xl/g, 'bg-white dark:bg-[#1a1a1e] p-6 shadow-sm rounded-2xl border border-zinc-200 dark:border-zinc-800');
  
  content = content.replace(/bg-white dark:bg-slate-900\/50 backdrop-blur p-5 shadow-sm/g, 'bg-zinc-50 dark:bg-[#1a1a1e] p-5 shadow-sm border border-zinc-200 dark:border-zinc-800');
  
  content = content.replace(/bg-white dark:bg-slate-900\/40 backdrop-blur p-5 transition/g, 'bg-white dark:bg-[#1a1a1e] p-5 transition border border-zinc-200 dark:border-zinc-800');
  content = content.replace(/bg-slate-50 dark:bg-slate-900\/30 backdrop-blur p-5 transition/g, 'bg-white dark:bg-[#1a1a1e] p-5 transition border border-zinc-200 dark:border-zinc-800');
  
  content = content.replace(/bg-white dark:bg-slate-900\/40/g, 'bg-zinc-50 dark:bg-[#1a1a1e]');
  content = content.replace(/bg-slate-50 dark:bg-slate-900\/30/g, 'bg-zinc-100 dark:bg-[#131316]');
  content = content.replace(/bg-slate-100 dark:bg-slate-800\/50/g, 'bg-zinc-100 dark:bg-[#1a1a1e]');
  content = content.replace(/bg-slate-50 dark:bg-slate-950\/50/g, 'bg-zinc-50 dark:bg-[#0f0f11]');
  content = content.replace(/bg-white dark:bg-slate-900/g, 'bg-white dark:bg-[#1a1a1e]');

  // Text color adjustments for neutrality
  content = content.replace(/text-slate-900/g, 'text-zinc-900');
  content = content.replace(/text-slate-500/g, 'text-zinc-500');
  content = content.replace(/text-slate-400/g, 'text-zinc-400');
  content = content.replace(/text-slate-700/g, 'text-zinc-700');
  content = content.replace(/text-slate-200/g, 'text-zinc-200');
  content = content.replace(/border-slate-[0-9]+/g, 'border-zinc-200'); // normal light mode borders
  content = content.replace(/border-white\/10/g, 'border-zinc-800'); 
  content = content.replace(/border-white\/5/g, 'border-zinc-800/50');
  // Drop shadows
  content = content.replace(/dark:drop-shadow-\[[^\]]+\]/g, ''); // strip neonatal drop shadows
  content = content.replace(/drop-shadow-\[[^\]]+\]/g, ''); 

  // Language / professional verbiage refactor
  content = content.replace(/>UNSPECIFIED</g, 'className="text-zinc-500 italic">Not specified<');
  content = content.replace(/"UNSPECIFIED"/g, '"Not specified"');
  content = content.replace(/IDENTITY MODULE/g, 'Profile Highlights');
  content = content.replace(/LOCATION TELEMETRY/g, 'Live Telemetry');
  content = content.replace(/TACTICAL ACTIONS/g, 'Quick Actions');
  content = content.replace(/Tactical Actions/g, 'Quick Actions');
  content = content.replace(/Personal Safety Console/g, 'Dashboard Overview');
  content = content.replace(/PERSONAL BIO-DATA/g, 'Personal Information');
  content = content.replace(/FAILSAFE CONTACT/g, 'Emergency Contacts');
  content = content.replace(/FEDERATION IDENTITY/g, 'Government Identity (KYC)');
  content = content.replace(/Agent Designation \(Name\)/g, 'Full Name');
  content = content.replace(/Comms 1 \(Phone\)/g, 'Primary Phone');
  content = content.replace(/Comms 2 \(Alt\)/g, 'Alternative Phone');
  content = content.replace(/Date of Origin/g, 'Date of Birth');
  content = content.replace(/Blood Sector/g, 'Blood Group');
  content = content.replace(/Field Bio/g, 'Short Biography');
  content = content.replace(/Base Coordinates \(Address\)/g, 'Permanent Address');

  // Strip excessive borders around profile images
  content = content.replace(/ring-2 ring-emerald-500\/50/g, 'ring-2 ring-zinc-200 dark:ring-[#2b2b30]');
  content = content.replace(/ring-2 ring-emerald-500\/30/g, 'ring-2 ring-zinc-200 dark:ring-[#2b2b30]');
  
  // Re-map UI component backgrounds (from intense neon border maps to solid)
  // Example for ActionCard colorMap
  content = content.replace(/bg-red-500\/10/g, 'bg-red-50 dark:bg-red-500/10');
  content = content.replace(/bg-amber-500\/10/g, 'bg-amber-50 dark:bg-amber-500/10');
  content = content.replace(/bg-emerald-500\/10/g, 'bg-emerald-50 dark:bg-emerald-500/10');
  content = content.replace(/bg-cyan-500\/10/g, 'bg-cyan-50 dark:bg-cyan-500/10');
  content = content.replace(/bg-blue-500\/10/g, 'bg-blue-50 dark:bg-blue-500/10');
  content = content.replace(/bg-violet-500\/10/g, 'bg-violet-50 dark:bg-violet-500/10');

  // Make text more grey-scale for modern dark look inside components
  content = content.replace(/text-amber-400/g, 'text-amber-600 dark:text-amber-500');
  content = content.replace(/text-emerald-400/g, 'text-emerald-600 dark:text-emerald-500');
  content = content.replace(/text-cyan-400/g, 'text-cyan-600 dark:text-cyan-500');
  content = content.replace(/text-blue-400/g, 'text-blue-600 dark:text-blue-500');
  content = content.replace(/text-red-400/g, 'text-red-600 dark:text-red-500');
  content = content.replace(/text-violet-400/g, 'text-violet-600 dark:text-violet-500');
  content = content.replace(/text-white/g, 'text-zinc-900 dark:text-white'); // ensure main headings get converted

  // Removing any lingering glow / pulse classes
  content = content.replace(/\banimate-pulse\b/g, ''); 
  content = content.replace(/\banimate-ping\b/g, '');

  fs.writeFileSync(userFile, content);
  console.log('User dashboard updated.');
}

const adminFile = path.join(__dirname, 'src/app/dashboard/admin/page.tsx');
if (fs.existsSync(adminFile)) {
  let content = fs.readFileSync(adminFile, 'utf8');

  // Same global aesthetic replacements and neutering of generic tech nonsense
  content = content.replace(/bg-white dark:bg-slate-900\/60 backdrop-blur-xl p-6 shadow-sm dark:shadow-2xl/g, 'bg-white dark:bg-[#1a1a1e] p-6 shadow-sm rounded-2xl border border-zinc-200 dark:border-zinc-800');
  content = content.replace(/bg-white dark:bg-slate-900\/50 backdrop-blur p-5 shadow-sm/g, 'bg-zinc-50 dark:bg-[#1a1a1e] p-5 shadow-sm border border-zinc-200 dark:border-zinc-800');
  content = content.replace(/bg-white dark:bg-slate-900\/40 backdrop-blur p-5 transition/g, 'bg-white dark:bg-[#1a1a1e] p-5 transition border border-zinc-200 dark:border-zinc-800');
  content = content.replace(/bg-slate-50 dark:bg-slate-900\/30 backdrop-blur p-5 transition/g, 'bg-white dark:bg-[#1a1a1e] p-5 transition border border-zinc-200 dark:border-zinc-800');
  
  content = content.replace(/bg-white dark:bg-slate-900\/40/g, 'bg-zinc-50 dark:bg-[#1a1a1e]');
  content = content.replace(/bg-slate-50 dark:bg-slate-900\/30/g, 'bg-zinc-100 dark:bg-[#131316]');
  content = content.replace(/bg-white dark:bg-slate-900/g, 'bg-white dark:bg-[#1a1a1e]');
  
  // Generic text classes
  content = content.replace(/text-slate-900/g, 'text-zinc-900');
  content = content.replace(/text-slate-500/g, 'text-zinc-500');
  content = content.replace(/text-slate-400/g, 'text-zinc-400');
  content = content.replace(/text-white/g, 'text-zinc-900 dark:text-white');
  
  content = content.replace(/border-white\/10/g, 'border-zinc-800');
  content = content.replace(/border-white\/5/g, 'border-zinc-800/50');

  // Strip dropshadows
  content = content.replace(/dark:drop-shadow-\[[^\]]+\]/g, ''); 
  content = content.replace(/drop-shadow-\[[^\]]+\]/g, ''); 

  // Make it amber focused 
  content = content.replace(/text-amber-400/g, 'text-amber-600 dark:text-amber-500');
  content = content.replace(/text-emerald-400/g, 'text-emerald-600 dark:text-emerald-500');
  content = content.replace(/text-cyan-400/g, 'text-cyan-600 dark:text-cyan-500');
  content = content.replace(/text-red-400/g, 'text-red-600 dark:text-red-500');
  content = content.replace(/text-blue-400/g, 'text-blue-600 dark:text-blue-500');

  // Fix words
  content = content.replace(/"UNSPECIFIED"/g, '"Not specified"');
  
  fs.writeFileSync(adminFile, content);
  console.log('Admin dashboard updated.');
}

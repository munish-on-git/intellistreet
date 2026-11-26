export const getCategoryBadgeColor = (cat: string) => {
  switch (cat) {
    case 'road_damage': return 'bg-red-500/10 text-red-400 border border-red-500/20';
    case 'drainage_problem': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case 'water_leakage': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    case 'garbage': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    case 'street_light_failure': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'electrical_hazard': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    case 'public_infrastructure': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
  }
};

export const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-red-500/10 text-red-400 border border-red-500/30';
    case 'verified': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
    case 'assigned': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
    case 'in_progress': return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
    case 'resolved': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/30';
  }
};

export const getPriorityTextColor = (priority: string) => {
  switch (priority) {
    case 'critical': return 'text-red-400 font-bold';
    case 'high': return 'text-orange-400 font-semibold';
    case 'medium': return 'text-yellow-400 font-semibold';
    default: return 'text-emerald-400';
  }
};

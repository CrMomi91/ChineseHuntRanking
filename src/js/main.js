// ====== 入口初始化 ======

// 恢复自建队伍显示开关
(function(){var v=localStorage.getItem('hunt_sim_show');document.getElementById('simToggle').checked=v==='true';})();

// 初始计算并渲染
recomputeTeams(comps);
renderAll();

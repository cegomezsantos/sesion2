async function consultar() {
    const q = document.getElementById("prompt").value;
    const res = await fetch("/.netlify/functions/consulta?prompt=" + encodeURIComponent(q));
    document.getElementById("respuesta").textContent = await res.text();
  }
  
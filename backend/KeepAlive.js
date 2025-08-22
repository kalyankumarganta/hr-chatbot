import fetch from "node-fetch";

const URL = "https://hr-chatbot-1-m1fk.onrender.com/";

async function ping() {
  try {
    const res = await fetch(URL);
    console.log(`Pinged: ${URL} | Status: ${res.status}`);
  } catch (err) {
    console.error("Ping failed:", err.message);
  }
}

// ping every 5 minutes
setInterval(ping, 5 * 60 * 1000);
ping();

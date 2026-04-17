//scripts/login.js
async function handleLogin(event) {
  event.preventDefault();

  const email = document.querySelector("input[type=email]").value;
  const senha = document.querySelector("input[type=password]").value;

  await login(email, senha);
}

async function login(email, senha) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    alert("Erro: " + error.message);
  } else {
    window.location.href = "tarefas.html";
  }
}
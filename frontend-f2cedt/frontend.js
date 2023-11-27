const apiUrl = "http://localhost:5001";

async function registerOrLogin() {
  const name = document.getElementById("username").value;
  let response;
  try {
    response = await fetch(`${apiUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.status === 404) {
      response = await fetch(`${apiUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }
    const data = await response.json();
    localStorage.setItem("uid", data.uid);
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("problemsSection").classList.remove("hidden");

    fetchProblems();
  } catch (error) {
    console.error("Error during register/login:", error);
  }
}
function fetchProblems() {
  fetch(`${apiUrl}/problems`)
    .then((response) => response.json())
    .then((problems) => {
      const problemsList = document.getElementById("problemsList");
      problemsList.innerHTML = ""; // Clear the previous list

      if (problems.length === 0) {
        problemsList.innerHTML =
          "<tr><td colspan='2' class='text-center border px-4 py-2'>No problems available at the moment.</td></tr>";
      } else {
        problems.forEach((problem) => {
          const tr = document.createElement("tr");

          const tdTitle = document.createElement("td");
          tdTitle.className = "border px-4 py-2";
          tdTitle.textContent = problem.title;

          const tdActions = document.createElement("td");
          tdActions.className = "border px-4 py-2";

          const viewBtn = document.createElement("button");
          viewBtn.textContent = "View Problem";
          viewBtn.className =
            "bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded";
          viewBtn.onclick = function () {
            viewProblem(problem._id);
            document.getElementById("resultMessage").textContent =
              "No submit yet"; // Using problem._id instead of problem.id
          };
          tdActions.appendChild(viewBtn);

          tr.appendChild(tdTitle);
          tr.appendChild(tdActions);
          problemsList.appendChild(tr);
        });
      }
    })
    .catch((error) => {
      console.error("Error fetching problems:", error);
    });
}

let currentProblemId = null;

function viewProblem(problemId) {
  fetch(`${apiUrl}/problems/${problemId}`)
    .then((response) => response.json())
    .then((problem) => {
      document.getElementById("problemTitlePopup").textContent = problem.title;
      document.getElementById("problemDescriptionPopup").innerHTML =
        problem.description;
      document.getElementById("problemPopup").classList.remove("hidden");
      currentProblemId = problem._id;
    })
    .catch((error) => {
      console.error("Error fetching problem:", error);
    });
}

function closeProblemPopup() {
  document.getElementById("problemPopup").classList.add("hidden");
}

function submitCode() {
  const codeEditor = document.getElementById("codeEditor");
  const languageSelector = document.getElementById("languageSelector");

  const code = codeEditor.value;
  const language = languageSelector.value;

  if (!currentProblemId) {
    console.error("No problem selected.");
    return;
  }

  const problemId = currentProblemId;

  const uid = localStorage.getItem("uid");
  fetch(`${apiUrl}/submitsolution`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      language,
      problemId,
      uid, // Add uid here
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "All test cases passed!") {
        document.getElementById("resultMessage").textContent = data.message;
      } else {
        document.getElementById("resultMessage").textContent =
          "Some test cases failed.";
      }
    })
    .catch((error) => {
      console.error("Error submitting the solution:", error); // Likely line 129
      alert("There was an error submitting the solution.");
    });
}

function closeModal() {
  document.getElementById("problemModal").classList.add("hidden");
}
document.getElementById("resultMessage").textContent = "No submit yet";
document.addEventListener("DOMContentLoaded", fetchProblems);

async function createProblem() {
  const titleElement = document.getElementById("problemTitle");
  if (!titleElement.value.trim()) {
    alert("Please enter a problem title.");
    return;
  }

  const descriptionContent = quill.getText().trim();
  if (!descriptionContent) {
    alert("Please enter a problem description.");
    return;
  }

  const csvUpload = document.getElementById("csvUpload");
  if (!csvUpload.files.length) {
    alert("Please upload a CSV file.");
    return;
  }

  const file = csvUpload.files[0];
  const reader = new FileReader();
  reader.onload = async function (event) {
    const csvData = event.target.result;
    const testCases = processCSV(csvData);

    const title = document.getElementById("problemTitle").value;
    const descriptionHTML = quill.root.innerHTML;
    const difficulty = document.getElementById("problemDifficulty").value;

    try {
      const response = await fetch(`${apiUrl}/problems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: descriptionHTML,
          difficulty,
          testCases,
        }),
      });

      if (response.ok) {
        document.getElementById("problemTitle").value = "";
        document.getElementById("problemDifficulty").value = "";
        quill.setText("");
        document.getElementById("csvUpload").value = ""; // Clear the file input

        alert("Problem created successfully!");

        fetchProblems(); // Refresh the list of problems
      } else {
        console.error("Error creating the problem:", await response.text());
      }
    } catch (error) {
      console.error("Error during problem creation:", error);
    }
  };
  reader.readAsText(file);
}

function initializePage() {
  const isLoggedIn = !!localStorage.getItem("uid");
  if (isLoggedIn) {
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("profileSection").classList.remove("hidden");
    document.getElementById("problemsSection").classList.remove("hidden");
    const uid = localStorage.getItem("uid");
    fetch(`${apiUrl}/get-user/${uid}`)
      .then((response) => response.json())
      .then((data) => {
        document.getElementById("profileName").textContent = data.name;
        const initial = data.name.charAt(0).toUpperCase();
        document.getElementById("profileInitial").textContent = initial;
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
      });
  } else {
    document.getElementById("loginSection").classList.remove("hidden");
    document.getElementById("profileSection").classList.add("hidden");
    document.getElementById("problemsSection").classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", initializePage);
document.addEventListener("DOMContentLoaded", function () {
  quill = new Quill("#editor", {
    theme: "snow",
  });
  fetchProblems();
  initializePage();
});

async function registerOrLogin() {
  const name = document.getElementById("username").value;
  let response;
  try {
    response = await fetch(`${apiUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.status === 404) {
      response = await fetch(`${apiUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }
    const data = await response.json();
    localStorage.setItem("uid", data.uid);
    initializePage();
  } catch (error) {
    console.error("Error during register/login:", error);
  }
}

function logout() {
  localStorage.removeItem("uid");
  location.reload();
}

function toggleDropdown(event) {
  const dropdown = document.getElementById("profileDropdown");
  if (dropdown.classList.contains("hidden")) {
    dropdown.classList.remove("hidden");
  } else {
    dropdown.classList.add("hidden");
  }
  event.stopPropagation();
}

document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("profileDropdown");
  const profilePicture = document.getElementById("profilePicture");
  if (
    !profilePicture.contains(event.target) &&
    !dropdown.contains(event.target)
  ) {
    dropdown.classList.add("hidden");
  }
});

function processCSV(csvData) {
  const rows = csvData.split("\n").filter((row) => row.trim().length > 0);
  const testCases = [];

  rows.forEach((row) => {
    const [input, expectedOutput] = row.split(",").map((value) => value.trim());
    testCases.push({ input: input, output: expectedOutput });
  });

  return testCases;
}

document.getElementById("closePopupBtn").addEventListener("click", function () {
  document.getElementById("problemPopup").classList.add("hidden");
});

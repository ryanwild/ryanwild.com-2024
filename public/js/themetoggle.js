function setTheme(mode) {
  sessionStorage.setItem("theme-storage", mode);
  let htmlElement = document.querySelector("html");

  if (mode === "dark") {
    document.getElementById("darkModeStyle").disabled = false;
    htmlElement.classList.remove("light");
    htmlElement.classList.add("dark");

    document.getElementById("sun-icon").style.display = "inline-block";
    document.getElementById("moon-icon").style.display = "none";
  } else if (mode === "light") {
    document.getElementById("darkModeStyle").disabled = true;
    htmlElement.classList.remove("dark");
    htmlElement.classList.add("light");

    document.getElementById("sun-icon").style.display = "none";
    document.getElementById("moon-icon").style.display = "inline-block";
  }
}

function toggleTheme() {
  if (sessionStorage.getItem("theme-storage") === "light") {
    setTheme("dark");
  } else if (sessionStorage.getItem("theme-storage") === "dark") {
    setTheme("light");
  }
}

function getSavedTheme() {
  let currentTheme = sessionStorage.getItem("theme-storage");
  if (!currentTheme) {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      currentTheme = "dark";
    } else {
      currentTheme = "light";
    }
  }

  return currentTheme;
}

setTheme(getSavedTheme());

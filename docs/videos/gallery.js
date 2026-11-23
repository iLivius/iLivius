"use strict";

const viewer = document.querySelector(".viewer");
const title = document.getElementById("viewer-title");
const player = viewer.querySelector(".player");
const sourceLink = viewer.querySelector(".source-link");
const loop = document.getElementById("loop-video");
const chapterPanel = viewer.querySelector(".chapters");
const chapterList = chapterPanel.querySelector("ol");
const playbackError = viewer.querySelector(".video-error");
const films = new Map(Array.from(document.querySelectorAll("[data-film]"), link => [link.dataset.film, link]));
let opener;
let currentVideo;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(Math.floor(seconds % 60)).padStart(2, "0");
  return minutes + ":" + remainder;
}

function addChapters(video, chapters) {
  if (!chapters.length) return;

  let active = null;
  const buttons = chapters.map(([start, chapterTitle]) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const time = document.createElement("time");
    time.dateTime = "PT" + start + "S";
    time.textContent = formatTime(start);
    button.type = "button";
    button.className = "chapter";
    button.append(time, chapterTitle);
    button.addEventListener("click", () => {
      video.currentTime = start;
      video.play().catch(() => {});
    });
    item.append(button);
    chapterList.append(item);
    return button;
  });

  function highlight() {
    const next = chapters.findIndex(([start]) => start > video.currentTime);
    const button = next < 0 ? buttons.at(-1) : buttons[Math.max(0, next - 1)];
    if (active === button) return;
    active?.removeAttribute("aria-current");
    button.setAttribute("aria-current", "time");
    active = button;
  }

  chapterPanel.hidden = false;
  viewer.classList.add("has-chapters");
  video.addEventListener("timeupdate", highlight);
  highlight();
}

function openFilm(link, play) {
  if (viewer.open) return false;
  const film = link.dataset;
  if (film.youtube && location.protocol === "file:") return false;

  opener = link;
  title.textContent = film.title;
  sourceLink.href = film.src ?? link.href;
  playbackError.hidden = true;

  if (film.youtube) {
    const iframe = document.createElement("iframe");
    iframe.title = film.title + " on YouTube";
    iframe.src = "https://www.youtube-nocookie.com/embed/" + film.youtube + (play ? "?autoplay=1" : "");
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    player.append(iframe);
    sourceLink.textContent = "Watch on YouTube";
  } else {
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = film.poster;
    video.src = sourceLink.href;
    video.setAttribute("aria-label", film.title);
    video.addEventListener("error", () => { playbackError.hidden = false; });
    player.append(video);
    currentVideo = video;
    loop.checked = false;
    loop.parentElement.hidden = false;
    sourceLink.textContent = "Open MP4";
    addChapters(video, biofluxChapters[film.film] ?? []);
  }

  viewer.showModal();
  if (play && currentVideo) currentVideo.play().catch(() => {});
  if (location.protocol !== "file:") history.replaceState(null, "", "#" + film.film);
  return true;
}

for (const link of films.values()) {
  link.addEventListener("click", event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (openFilm(link, true)) event.preventDefault();
  });
}

loop.addEventListener("change", () => {
  if (currentVideo) currentVideo.loop = loop.checked;
});

viewer.addEventListener("close", () => {
  currentVideo?.pause();
  currentVideo = null;
  player.replaceChildren();
  chapterList.replaceChildren();
  chapterPanel.hidden = true;
  viewer.classList.remove("has-chapters");
  loop.parentElement.hidden = true;
  if (location.protocol !== "file:" && films.has(location.hash.slice(1))) {
    history.replaceState(null, "", location.pathname + location.search);
  }
  opener?.focus({ preventScroll: true });
  opener = null;
});

const linkedFilm = films.get(location.hash.slice(1));
if (linkedFilm) openFilm(linkedFilm, false);
if (location.hash === "#credits") document.getElementById("credits").open = true;

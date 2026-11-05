(function () {
  "use strict";

  // Independent raster mask; the composition itself remains rendered by the editor.
  window.createDrawingTools = function (options) {
    var preview = options.canvas;
    var onChange = options.onChange;
    var mask = document.createElement("canvas");
    mask.width = 1280;
    mask.height = 800;
    var maskContext = mask.getContext("2d");
    var mode = "image";
    var drawing = false;
    var last = null;
    var pointerId = null;

    var styles = document.createElement("style");
    styles.textContent =
      ".drawing-tools{display:flex;flex-direction:column;gap:9px}" +
      ".drawing-label-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px}" +
      ".drawing-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:3px;border:1px solid #363731;border-radius:9px;background:#10110f}" +
      ".drawing-button{min-height:36px;border:0;border-radius:6px;background:transparent;color:#a4a59c;font-size:11px;cursor:pointer}" +
      ".drawing-button:hover{color:#f1f0e9}.drawing-button.active{background:#33332f;color:#f1f0e9;box-shadow:inset 0 0 0 1px #55554f}" +
      ".drawing-brush{display:flex;flex-direction:column;gap:5px}.drawing-brush[hidden]{display:none}" +
      ".drawing-foot{display:flex;align-items:center;justify-content:space-between;gap:8px}" +
      ".drawing-clear{padding:4px 0;border:0;background:transparent;color:#b8b9b0;font-size:10px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}" +
      ".drawing-clear:hover{color:#f1f0e9}.drawing-tip{margin:0;color:#8f9187;font-size:10px;line-height:1.4}" +
      "#preview.drawing-active{cursor:crosshair;touch-action:none}" +
      ".drawing-button:focus-visible,.drawing-clear:focus-visible{outline:2px solid #e3e3dc;outline-offset:2px}";
    document.head.appendChild(styles);

    var section = document.createElement("section");
    section.className = "drawing-tools";
    section.setAttribute("aria-label", "Рисование формы");
    section.innerHTML =
      '<div class="drawing-label-row"><span class="label">ИСТОЧНИК ФОРМЫ</span></div>' +
      '<div class="drawing-buttons" role="group" aria-label="Инструменты рисования">' +
      '<button class="drawing-button active" type="button" data-draw-mode="image" aria-pressed="true">Картинка</button>' +
      '<button class="drawing-button" type="button" data-draw-mode="draw" aria-pressed="false">Рисовать</button>' +
      '<button class="drawing-button" type="button" data-draw-mode="erase" aria-pressed="false">Ластик</button>' +
      '</div>' +
      '<div class="drawing-brush" hidden>' +
      '<div class="drawing-label-row"><label class="label" for="drawingBrushSize">РАЗМЕР КИСТИ</label><output class="value" id="drawingBrushValue">64</output></div>' +
      '<input id="drawingBrushSize" type="range" min="4" max="160" value="64" aria-label="Размер кисти">' +
      '<div class="drawing-foot"><p class="drawing-tip">Ведите по холсту, чтобы менять форму.</p><button class="drawing-clear" type="button">Очистить</button></div>' +
      '</div>';
    var upload = document.getElementById("uploadButton");
    upload.insertAdjacentElement("afterend", section);
    var brushInput = section.querySelector("#drawingBrushSize");
    var brushValue = section.querySelector("#drawingBrushValue");
    var brushGroup = section.querySelector(".drawing-brush");
    var modeButtons = section.querySelectorAll("[data-draw-mode]");

    function updateUI() {
      modeButtons.forEach(function (button) {
        var active = button.dataset.drawMode === mode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      var activeDrawing = mode !== "image";
      brushGroup.hidden = !activeDrawing;
      preview.classList.toggle("drawing-active", activeDrawing);
    }
    function setMode(next, notify) {
      if (mode === next) return;
      mode = next;
      drawing = false;
      last = null;
      updateUI();
      if (notify) onChange();
    }
    modeButtons.forEach(function (button) {
      button.addEventListener("click", function () { setMode(button.dataset.drawMode, true); });
    });
    brushInput.addEventListener("input", function () { brushValue.textContent = brushInput.value; });
    section.querySelector(".drawing-clear").addEventListener("click", function () {
      maskContext.clearRect(0, 0, mask.width, mask.height);
      onChange();
    });

    function point(event) {
      var bounds = preview.getBoundingClientRect();
      return {
        x: (event.clientX - bounds.left) * mask.width / bounds.width,
        y: (event.clientY - bounds.top) * mask.height / bounds.height
      };
    }
    function paint(from, to) {
      maskContext.save();
      maskContext.globalCompositeOperation = mode === "erase" ? "destination-out" : "source-over";
      maskContext.strokeStyle = "#000000";
      maskContext.fillStyle = "#000000";
      maskContext.lineWidth = Number(brushInput.value);
      maskContext.lineCap = "round";
      maskContext.lineJoin = "round";
      maskContext.beginPath();
      if (from) {
        maskContext.moveTo(from.x, from.y);
        maskContext.lineTo(to.x, to.y);
        maskContext.stroke();
      } else {
        maskContext.arc(to.x, to.y, maskContext.lineWidth / 2, 0, Math.PI * 2);
        maskContext.fill();
      }
      maskContext.restore();
      onChange();
    }
    preview.addEventListener("pointerdown", function (event) {
      if (mode === "image" || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      drawing = true;
      pointerId = event.pointerId;
      preview.setPointerCapture(pointerId);
      last = point(event);
      paint(null, last);
    });
    preview.addEventListener("pointermove", function (event) {
      if (!drawing || pointerId !== event.pointerId) return;
      event.preventDefault();
      var next = point(event);
      paint(last, next);
      last = next;
    });
    function finish(event) {
      if (event.pointerId !== pointerId) return;
      drawing = false;
      last = null;
      pointerId = null;
    }
    preview.addEventListener("pointerup", finish);
    preview.addEventListener("pointercancel", finish);
    preview.addEventListener("lostpointercapture", finish);
    updateUI();

    return {
      useDrawing: function () { return mode !== "image"; },
      drawTo: function (ctx, width, height) { ctx.drawImage(mask, 0, 0, width, height); },
      useImage: function () { setMode("image", false); },
      clearDrawing: function () { maskContext.clearRect(0, 0, mask.width, mask.height); }
    };
  };
})();

(() => {
  "use strict";

  const gui = require("nw.gui");
  const EventEmitter = require("events").EventEmitter;
  const packageJson = require("./package.json");
  const UpdateChecker = require("./util/UpdateChecker");

  const doc = document.currentScript.ownerDocument;

  class PreferenceDialog extends window.jikkyo.Modal {

    createdCallback() {
      super.createdCallback();

      this.relative = true;
      this.top = this.left = this.right = this.bottom = 50;

      this._preference = null;

      this.appendStyle(document.importNode(doc.querySelector("#style").content, true));
      this.appendContent(document.importNode(doc.querySelector("#content").content, true));

      this._modePrefs = [];
      this._initPrefCb = [];
      this._savePrefCb = [];
      this._tabs = this.content.querySelector("#tabs");
      this._prefs = this.content.querySelector("#prefs");
      this._event = new EventEmitter();

      const prefc = this.content.querySelectorAll(".pref");
      Array.from(prefc).forEach(c => {
        this.addModePreference(c, c.dataset.title, null, null, true, c.hasAttribute("data-last"));
      }, this);

      this.content.querySelector("#ok").addEventListener("click", (() => {
        this.hide();
      }).bind(this));

      const modal = this.shadowRoot.querySelector("#about-modal");

      this.shadowRoot.querySelector("#about-version").textContent = packageJson.version;
      this.shadowRoot.querySelector("#about-homepage").addEventListener("click", () => {
        gui.Shell.openExternal(packageJson.homepage);
      });
      this.shadowRoot.querySelector("#about-repository").addEventListener("click", () => {
        gui.Shell.openExternal(packageJson.repository.url);
      });
      this.shadowRoot.querySelector("#about-check").addEventListener("click", () => {
        modal.use("loading");
        modal.show();

        const checker = new UpdateChecker({
          user: "rot1024",
          repos: "jikkyo"
        });

        checker.check().then(data => {
          if (data === null) {
            modal.use("alert", "最新バージョンをお使いです。");
            return;
          }

          modal.use(
            "yesno",
            `新バージョン ${data.latest.version} が公開されています。リリースページを開きますか？`,
            null,
            () => {
              gui.Shell.openExternal(data.latest.url);
              modal.hide();
            }
          );
        }).catch(err => {
          console.error(err);
          modal.use("alert", "データの取得に失敗しました。");
        });
      });
    }

    get preference() {
      return this._preference;
    }

    set preference(v) {
      this._preference = v;
      const init = this._initGeneralPreference();
      if (!v.general) {
        v.general = init;
        v.save();
      } else {
        let count = 0;
        Object.keys(init).forEach(key => {
          if (v.general[key] === void 0) {
            v.general[key] = init[key];
            count++;
          }
        });
        if (count > 0) v.save();
      }
    }

    on(type, listener) {
      this._event.on(type, listener);
    }

    off(type, listener) {
      this._event.removeListener(type, listener);
    }

    show() {
      let at = this._tabs.querySelector(".active");
      if (at) at.classList.remove("active");
      at = this._prefs.querySelector(".pref.active");
      if (at) at.classList.remove("active");
      at = this._tabs.children[0];
      if (at) at.classList.add("active");
      at = this._prefs.children[0];
      if (at) at.classList.add("active");

      if (this.preference) {
        this._modePrefs.forEach((p, i) => this._initPrefCb[i](p), this);
        if (!this.preference.general)
          this.preference.general = this._initGeneralPreference();
        this._loadGeneralPreference(this.content, this.preference.general);
      }

      this._event.emit("show");
      super.show();
    }

    hide() {
      const pr = this.preference;
      if (pr) {
        this._modePrefs.forEach((p, i) => this._savePrefCb[i](p), this);
        this._saveGeneralPreference(this.content, this.preference.general);
        pr.save();
      }

      this._event.emit("hide");
      super.hide();
    }

    addModePreference(element, title, initCb, saveCb, builtin, last) {
      if (!element) return;
      const tab = document.createElement("li");
      if (last) tab.setAttribute("data-last", "");
      tab.textContent = title;
      tab.addEventListener("click", (() => {
        const active = this._prefs.querySelector(".active");
        if (active) active.classList.remove("active");
        element.classList.add("active");
        this._tabs.querySelector(".active").classList.remove("active");
        tab.classList.add("active");
      }).bind(this));
      element.classList.add("pref");
      this._prefs.appendChild(element);

      const lastTab = this._tabs.querySelector("li[data-last]");
      if (lastTab) this._tabs.insertBefore(tab, lastTab);
      else this._tabs.appendChild(tab);

      if (!builtin) {
        this._modePrefs.push(element);
        if (initCb) this._initPrefCb.push(initCb);
        if (saveCb) this._savePrefCb.push(saveCb);
      }
    }

    _initGeneralPreference() {
      return {
        fontFamily: process.platform === "darwin" ? "sans-serif" : "Meiryo, Segoe UI Symbol, sans-serif",
        fontWeight: true,
        duration: 4000,
        usDuration: 3000,
        limit: 100,
        opacity: 1,
        bulletOpacity: 1,
        sizing: 0,
        fontSize: "32px",
        rows: 12,
        windowBgColor: "#000",
        windowBgColorTransparent: true,
        style: "",
        bulletStyle: "",
        checkNewVersionAuto: true
      };
    }

    _loadGeneralPreference(r, p) {
      r.querySelector("#comment-font-family").value = p.fontFamily;
      r.querySelector("#comment-font-weight").checked = p.fontWeight;
      r.querySelector("#comment-duration").value = p.duration;
      r.querySelector("#comment-us-duration").value = p.usDuration;
      r.querySelector("#comment-limit").value = p.limit;
      r.querySelector("#comment-opacity").value = p.opacity;
      r.querySelector("#comment-bullet-opacity").value = p.bulletOpacity;
      r.querySelector("#comment-sizing").value = p.sizing;
      r.querySelector("#comment-font-size").value = p.fontSize;
      r.querySelector("#comment-rows").value = p.rows;
      r.querySelector("#comment-window-bgcolor").value = p.windowBgColor;
      r.querySelector("#comment-window-bgcolor-transparent").checked = p.windowBgColorTransparent;
      r.querySelector("#comment-style").value = p.style;
      r.querySelector("#comment-bullet-style").value = p.bulletStyle;
      r.querySelector("#about-check-auto").checked = p.checkNewVersionAuto;
    }

    _saveGeneralPreference(r, p) {
      let tmp;
      p.fontFamily = r.querySelector("#comment-font-family").value;
      p.fontWeight = r.querySelector("#comment-font-weight").checked;

      tmp = parseInt(r.querySelector("#comment-duration").value, 10);
      if (tmp >= 100 && tmp <= 10000) p.duration = tmp;

      tmp = parseInt(r.querySelector("#comment-us-duration").value, 10);
      if (tmp >= 100 && tmp <= 10000) p.usDuration = tmp;

      tmp = parseInt(r.querySelector("#comment-limit").value, 10);
      if (tmp >= 1) p.limit = tmp;

      tmp = parseFloat(r.querySelector("#comment-opacity").value);
      if (tmp >= 0 && tmp <= 1) p.opacity = tmp;

      tmp = parseFloat(r.querySelector("#comment-bullet-opacity").value);
      if (tmp >= 0 && tmp <= 1) p.bulletOpacity = tmp;

      p.sizing = parseInt(r.querySelector("#comment-sizing").value, 10);
      p.fontSize = r.querySelector("#comment-font-size").value;

      tmp = parseInt(r.querySelector("#comment-rows").value, 10);
      if (tmp > 0 && tmp < 40) p.rows = tmp;

      p.windowBgColor = r.querySelector("#comment-window-bgcolor").value;
      p.windowBgColorTransparent = r.querySelector("#comment-window-bgcolor-transparent").checked;
      p.style = r.querySelector("#comment-style").value;
      p.bulletStyle = r.querySelector("#comment-bullet-style").value;

      p.checkNewVersionAuto = r.querySelector("#about-check-auto").checked;
    }

  }

  window.jikkyo.PreferenceDialog = document.registerElement("jikkyo-preference-dialog", {
    prototype: PreferenceDialog.prototype
  });

})();

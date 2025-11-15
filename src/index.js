import { viewer as geocamViewer } from "./lib/viewer.js";
import { depthPlugin } from "./lib/depth-plugin.js";

export class GeocamViewer extends HTMLElement {
  static get observedAttributes() {
    return ["fov", "facing", "horizon", "src"];
  }

  constructor() {
    super();
    this.viewer = null;
    // this.yaw = this.getAttribute('yaw') || 0;
    console.log("init");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log("attribute changed", name, newValue);
    const that = this;

    const debouceAttrChange = function (name, val) {
      console.log("debouceAttrChange", name, val);
      if (that.viewer) {
        if (that.viewer[name]) {
          console.log("setting", name, val);
          that.viewer[name](val);
        } else {
          if (name == "src") {
            const [base, format] = val.split(".");
            that.viewer.show(
              [
                [`${base}/0.${format}`],
                [`${base}/1.${format}`],
                [`${base}/2.${format}`],
              ],
              0,
              [`${base}/0.obj`, `${base}/1.obj`, `${base}/2.obj`]
            );
          }
        }
      } else {
        setTimeout(() => debouceAttrChange(name, val), 100);
      }
    };

    debouceAttrChange(name, newValue);
  }

  connectedCallback() {
    console.log("connected");
    const node = this;
    this.style.display = "block";
    this.viewer = new geocamViewer(node, {
      plugins: [
        depthPlugin
      ],
    });

    // this.updateViewer();
  }

  updateViewer() {
    console.log("updating viewer");
    this.viewer.show(
      [
        [
          "https://image.geocam.xyz/gc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2/0/0000/00002506.jpg?bytes=8431183872-8434173007&container=https%3A%2F%2Fs3proxy.geocam.xyz%2Fgc-raw-surveys-archive%2FNIST%2FBoiseDriving%2FBen_10-27%2Fgc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2_0.tar",
        ],
        [
          "https://image.geocam.xyz/gc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2/1/0000/00002506.jpg?bytes=8022497792-8025797203&container=https%3A%2F%2Fs3proxy.geocam.xyz%2Fgc-raw-surveys-archive%2FNIST%2FBoiseDriving%2FBen_10-27%2Fgc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2_1.tar",
        ],
        [
          "https://image.geocam.xyz/gc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2/2/0000/00002506.jpg?bytes=8256700416-8259564683&container=https%3A%2F%2Fs3proxy.geocam.xyz%2Fgc-raw-surveys-archive%2FNIST%2FBoiseDriving%2FBen_10-27%2Fgc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2_2.tar",
        ],
      ],
      0,
      [
        "https://manager.geocam.xyz/calibration/717/hemisphere_0.obj",
        "https://manager.geocam.xyz/calibration/717/hemisphere_1.obj",
        "https://manager.geocam.xyz/calibration/717/hemisphere_2.obj",
      ]
    );
  }

  disconnectedCallback() {
    console.log("disconnected");
    // Clean up the viewer
    this.viewer = null;
  }
}

window.customElements.define("geocam-viewer", GeocamViewer);

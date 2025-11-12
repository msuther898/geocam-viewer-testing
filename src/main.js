import './index.js'

const SAMPLE_SHOT = {
  images: [
    'https://image.geocam.xyz/gc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2/0/0000/00002506.jpg?bytes=8431183872-8434173007&container=https%3A%2F%2Fs3proxy.geocam.xyz%2Fgc-raw-surveys-archive%2FNIST%2FBoiseDriving%2FBen_10-27%2Fgc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2_0.tar',
    'https://image.geocam.xyz/gc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2/1/0000/00002506.jpg?bytes=8022497792-8025797203&container=https%3A%2F%2Fs3proxy.geocam.xyz%2Fgc-raw-surveys-archive%2FNIST%2FBoiseDriving%2FBen_10-27%2Fgc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2_1.tar',
    'https://image.geocam.xyz/gc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2/2/0000/00002506.jpg?bytes=8256700416-8259564683&container=https%3A%2F%2Fs3proxy.geocam.xyz%2Fgc-raw-surveys-archive%2FNIST%2FBoiseDriving%2FBen_10-27%2Fgc2-2022-10-28-5985_s-Boise_driving_v-Ben1027_n-2_2.tar',
  ],
  meshes: [
    'https://manager.geocam.xyz/calibration/717/hemisphere_0.obj',
    'https://manager.geocam.xyz/calibration/717/hemisphere_1.obj',
    'https://manager.geocam.xyz/calibration/717/hemisphere_2.obj',
  ],
}

async function showSampleShot(element) {
  await customElements.whenDefined('geocam-viewer')

  if (typeof element.updateViewer === 'function') {
    element.updateViewer()
    return
  }

  const viewer = await waitForViewer(element)
  viewer.show(SAMPLE_SHOT.images.map((url) => [url]), 0, SAMPLE_SHOT.meshes)
}

function waitForViewer(element) {
  return new Promise((resolve) => {
    const check = () => {
      if (element.viewer) {
        resolve(element.viewer)
      } else {
        requestAnimationFrame(check)
      }
    }
    check()
  })
}

const viewerElement = document.getElementById('viewer')
if (viewerElement) {
  showSampleShot(viewerElement).catch((error) => {
    console.error('Failed to show sample shot', error)
  })
}

/*
  Intention Captions — ScriptUI panel
  ------------------------------------
  Install (optional):
    Copy this file and cwi-engine.jsx into
      Adobe After Effects/Scripts/ScriptUI Panels/
    Restart After Effects. Open Window > Intention Captions.
    Preferences > Scripting & Expressions >
      Allow Scripts to Write Files and Access Network.

  Or skip the install: export a .jsx from the studio and run it with
    File > Scripts > Run Script File.
*/

#target aftereffects
#include "cwi-engine.jsx"

(function (thisObj) {
  function readFile(f) {
    if (!f) return "";
    f.encoding = "UTF-8";
    if (!f.open("r")) return "";
    var text = f.read();
    f.close();
    return text;
  }

  function buildUI(thisObj) {
    var pal = (thisObj instanceof Panel)
      ? thisObj
      : new Window("palette", "Intention Captions", undefined, { resizeable: true });
    pal.orientation = "column";
    pal.alignChildren = ["fill", "top"];
    pal.margins = 12;
    pal.spacing = 8;

    pal.add("statictext", undefined, "Intention Captions");
    var blurb = pal.add("statictext", undefined, "You do not need the official project. Run Build-Intention-Project.jsx to create and save the .aep, or import a studio JSON here.", { multiline: true });
    blurb.preferredSize = [280, 48];

    var importBtn = pal.add("button", undefined, "Import project and build…");
    var fontRow = pal.add("group");
    fontRow.alignChildren = ["left", "center"];
    fontRow.add("statictext", undefined, "Font");
    var fontInput = fontRow.add("edittext", undefined, "RobotoFlex-Regular");
    fontInput.characters = 22;
    fontInput.helpTip = "PostScript name of Roboto Flex as installed on this machine.";

    var placeCheck = pal.add("checkbox", undefined, "Place on the active composition");
    placeCheck.value = true;
    var axesCheck = pal.add("checkbox", undefined, "Variable font axes when available (AE 26+)");
    axesCheck.value = true;

    var status = pal.add("statictext", undefined, "Ready. Install Roboto Flex for pitch.", { multiline: true });
    status.preferredSize = [280, 64];

    importBtn.onClick = function () {
      var f = File.openDialog("Choose an Intention Captions project", "JSON:*.json;*.cwi.json,All:*.*");
      if (!f) return;
      status.text = "Building…";
      var result = cwiBuildFromJSON(readFile(f), {
        placeOnActive: placeCheck.value,
        useAxes: axesCheck.value,
        fontName: fontInput.text
      });
      status.text = result.message;
      alert(result.message);
    };

    pal.onResizing = pal.onResize = function () {
      pal.layout.resize();
    };
    pal.layout.layout(true);
    return pal;
  }

  var pal = buildUI(thisObj);
  if (pal instanceof Window) {
    pal.center();
    pal.show();
  }
})(this);

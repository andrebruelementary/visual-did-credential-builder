package com.elementarysoftware.vdcb.tree.actions;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.vdcb.AddObjectDialog;

public class AddJSONObjectAction extends JSONAction {

	TreeViewer treeViewer;
	
	public AddJSONObjectAction(TreeViewer viewer) {
		super("Add Object");
		treeViewer = viewer;
	}

	@Override
	public void run() {
		
		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();
		
		boolean askForName;
		if (selectedTreeItems.length == 0) {
			askForName = true;
		}
		else {
			askForName = !selectedOrParentIsJSONArray(selectedTreeItems);
		}
		
		String objectName = "";
		Shell shell = new Shell();
		AddObjectDialog dlg = new AddObjectDialog(shell);
		if(askForName) {
			dlg.open();
			if(dlg.getReturnCode() != Window.OK) {
				return;
			}
			objectName = dlg.getObjectName();
		}
		
		
		if (selectedTreeItems.length == 0) {
			// No tree item selected. Add to root element
			((JSONObject) treeViewer.getInput()).put(objectName, new JSONObject());
		} else {
			TreeItem selectedItem = selectedTreeItems[0];
			Object selectedJSONObject = selectedItem.getData();
			if (selectedJSONObject.getClass() == SimpleEntry.class) {
				SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

				Object jsonValue = jsonElement.getValue();
				Class jsonType = jsonValue.getClass();
				if (jsonType == JSONObject.class) {
					addToObject((JSONObject) jsonValue, objectName, new JSONObject());
				} else if (jsonType == JSONArray.class) {
					addToArray((JSONArray) jsonValue, new JSONObject());
				} else {
					System.out.println(
							"Add to json property of type " + jsonValue.getClass() + "...add sibling object");
					TreeItem parent = ((TreeItem) selectedItem).getParentItem();
					
					if (parent == null) {
						// selected item is child of root
						addToObject((JSONObject) treeViewer.getInput(), objectName, new JSONObject());
					} else {
						Object parentJSONObject = parent.getData();
						if (parentJSONObject.getClass() == SimpleEntry.class) {
							SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

							Object jsonParentValue = jsonParentElement.getValue();
							Class jsonParentType = jsonParentValue.getClass();
							if (jsonParentType == JSONObject.class) {
								addToObject((JSONObject) jsonParentValue, objectName, new JSONObject());
							} else { 
								// element must be array...as a parent can only be Object or Array
								addToArray((JSONArray) jsonParentValue, new JSONObject());
							}
						}
					}
				}
			} else {
				System.out.println("primitive type " + selectedJSONObject.getClass() + "...add sibling object");
				TreeItem parent = ((TreeItem) selectedItem).getParentItem();
				
				if (parent == null) {
					// selected item is child of root
					addToObject((JSONObject) treeViewer.getInput(), objectName, new JSONObject());
				} else {
					Object parentJSONObject = parent.getData();
					if (parentJSONObject.getClass() == SimpleEntry.class) {
						SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

						Object jsonParentValue = jsonParentElement.getValue();
						Class jsonParentType = jsonParentValue.getClass();
						if (jsonParentType == JSONObject.class) {
							addToObject((JSONObject) jsonParentValue, objectName, new JSONObject());
						} else { 
							// element must be array...as a parent can only be Object or Array
							addToArray((JSONArray) jsonParentValue, new JSONObject());
						}
					}
				}
			}
		}
		
		treeViewer.refresh();
	}

}

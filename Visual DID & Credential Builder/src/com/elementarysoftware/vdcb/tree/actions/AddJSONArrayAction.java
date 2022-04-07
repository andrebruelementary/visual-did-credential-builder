package com.elementarysoftware.vdcb.tree.actions;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.vdcb.AddArrayDialog;

public class AddJSONArrayAction extends JSONAction {

	TreeViewer treeViewer;
	
	public AddJSONArrayAction(TreeViewer viewer) {
		super("Add List");
		treeViewer = viewer;
	}

	@Override
	public void run() {
		
		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();
		
		boolean askForName = selectedOrParentIsArray(selectedTreeItems);
		
		String arrayName = "";
		Shell shell = new Shell();
		AddArrayDialog dlg = new AddArrayDialog(shell);
		if(askForName) {
			dlg.open();
			if(dlg.getReturnCode() != Window.OK) {
				return;
			}
			arrayName = dlg.getArrayName();
		}
		
		if (selectedTreeItems.length == 0) {
			// No tree item selected. Add to root element
			((JSONObject) treeViewer.getInput()).put(arrayName, new JSONArray());
		} else {
			TreeItem selectedItem = selectedTreeItems[0];
			Object selectedJSONObject = selectedItem.getData();
			if (selectedJSONObject.getClass() == SimpleEntry.class) {
				SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

				Object jsonValue = jsonElement.getValue();
				Class jsonType = jsonValue.getClass();
				if (jsonType == JSONObject.class) {
					addToObject((JSONObject) jsonValue, arrayName, new JSONArray());
				} else if (jsonType == JSONArray.class) {
					addToArray((JSONArray) jsonValue, new JSONArray());
				} else {
					System.out.println(
							"Add to json property of type " + jsonValue.getClass() + "...add sibling object");
					TreeItem parent = ((TreeItem) selectedItem).getParentItem();
					
					if (parent == null) {
						// selected item is child of root
						addToObject((JSONObject) treeViewer.getInput(), arrayName, new JSONArray());
					} else {
						Object parentJSONObject = parent.getData();
						if (parentJSONObject.getClass() == SimpleEntry.class) {
							SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

							Object jsonParentValue = jsonParentElement.getValue();
							Class jsonParentType = jsonParentValue.getClass();
							if (jsonParentType == JSONObject.class) {
								addToObject((JSONObject) jsonParentValue, arrayName, new JSONArray());
							} else { 
								// element must be array...as a parent can only be Object or Array
								addToArray((JSONArray) jsonParentValue, new JSONArray());
							}
						}
					}
				}
			} else {
				System.out.println("primitive type " + selectedJSONObject.getClass() + "...add sibling object");
				TreeItem parent = ((TreeItem) selectedItem).getParentItem();
				
				if (parent == null) {
					// selected item is child of root
					addToObject((JSONObject) treeViewer.getInput(), arrayName, new JSONArray());
				} else {
					Object parentJSONObject = parent.getData();
					if (parentJSONObject.getClass() == SimpleEntry.class) {
						SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

						Object jsonParentValue = jsonParentElement.getValue();
						Class jsonParentType = jsonParentValue.getClass();
						if (jsonParentType == JSONObject.class) {
							addToObject((JSONObject) jsonParentValue, arrayName, new JSONArray());
						} else { 
							// element must be array...as a parent can only be Object or Array
							addToArray((JSONArray) jsonParentValue, new JSONArray());
						}
					}
				}
			}
		}
		
		treeViewer.refresh();
	}
	
	
	
}

package com.elementarysoftware.vdcb.tree.actions;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class AddJSONObjectAction extends JSONAction {

	TreeViewer treeViewer;
	
	public AddJSONObjectAction(TreeViewer viewer) {
		super("Add Object");
		treeViewer = viewer;
	}

	@Override
	public void run() {
		
		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();
		
		if (selectedTreeItems.length == 0) {
			// No tree item selected. Add to root element
			((JSONObject) treeViewer.getInput()).put("new value", Math.random());
		} else {
			TreeItem selectedItem = selectedTreeItems[0];
			Object selectedJSONObject = selectedItem.getData();
			if (selectedJSONObject.getClass() == SimpleEntry.class) {
				SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

				Object jsonValue = jsonElement.getValue();
				Class jsonType = jsonValue.getClass();
				if (jsonType == JSONObject.class) {
					addToObject((JSONObject) jsonValue, "new value", Math.random());
				} else if (jsonType == JSONArray.class) {
					addToArray((JSONArray) jsonValue, Math.random());
				} else {
					System.out.println(
							"Add to json property of type " + jsonValue.getClass() + "...add sibling object");
					TreeItem parent = ((TreeItem) selectedItem).getParentItem();
					
					if (parent == null) {
						// selected item is child of root
						addToObject((JSONObject) treeViewer.getInput(), "new value", Math.random());
					} else {
						Object parentJSONObject = parent.getData();
						if (parentJSONObject.getClass() == SimpleEntry.class) {
							SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

							Object jsonParentValue = jsonParentElement.getValue();
							Class jsonParentType = jsonParentValue.getClass();
							if (jsonParentType == JSONObject.class) {
								addToObject((JSONObject) jsonParentValue, "new value", Math.random());
							} else { 
								// element must be array...as a parent can only be Object or Array
								addToArray((JSONArray) jsonParentValue, Math.random());
							}
						}
					}
				}
			} else {
				System.out.println("primitive type " + selectedJSONObject.getClass() + "...add sibling object");
				TreeItem parent = ((TreeItem) selectedItem).getParentItem();
				
				if (parent == null) {
					// selected item is child of root
					addToObject((JSONObject) treeViewer.getInput(), "new value", Math.random());
				} else {
					Object parentJSONObject = parent.getData();
					if (parentJSONObject.getClass() == SimpleEntry.class) {
						SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

						Object jsonParentValue = jsonParentElement.getValue();
						Class jsonParentType = jsonParentValue.getClass();
						if (jsonParentType == JSONObject.class) {
							addToObject((JSONObject) jsonParentValue, "new value", Math.random());
						} else { 
							// element must be array...as a parent can only be Object or Array
							addToArray((JSONArray) jsonParentValue, Math.random());
						}
					}
				}
			}
		}
		
		treeViewer.refresh();
	}
	
	
	
}

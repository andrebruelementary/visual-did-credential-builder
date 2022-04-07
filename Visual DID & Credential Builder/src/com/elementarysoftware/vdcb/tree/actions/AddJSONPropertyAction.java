package com.elementarysoftware.vdcb.tree.actions;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.vdcb.AddPrimitiveDialog;
import com.elementarysoftware.vdcb.AddPropertyDialog;

public class AddJSONPropertyAction extends JSONAction {

	TreeViewer treeViewer;
	
	public AddJSONPropertyAction(TreeViewer viewer) {
		super("Add Named Value");
		treeViewer = viewer;
	}

	@Override
	public void run() {
		
		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();
		
		Shell shell = new Shell();
		AddPropertyDialog dlg = new AddPropertyDialog(shell);
		dlg.open();
		
		if(dlg.getReturnCode() != Window.OK) {
			return;
		}
		
		String selectedType = dlg.getSelectedType();
		String propertyName = dlg.getPropertyName();
		String tmpPropertyValue = dlg.getPropertyValue();
		
		Object propertyValue;
		if(selectedType.equals(PRIMITIVE_TYPE_STRING)) {
			propertyValue = tmpPropertyValue;
		}
		else if (selectedType.equals(PRIMITIVE_TYPE_INTEGER)) {
			propertyValue = Integer.parseInt(tmpPropertyValue);
		}
		else if(selectedType.equals(PRIMITIVE_TYPE_DOUBLE)) {
			propertyValue = Double.parseDouble(tmpPropertyValue);
		}
		else {
			System.err.println("Not supported property");
			return;
		}
		
		if (selectedTreeItems.length == 0) {
			// No tree item selected. Add to root element
			((JSONObject) treeViewer.getInput()).put(propertyName, propertyValue);
		} else {
			TreeItem selectedItem = selectedTreeItems[0];
			Object selectedJSONObject = selectedItem.getData();
			if (selectedJSONObject.getClass() == SimpleEntry.class) {
				SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

				Object jsonValue = jsonElement.getValue();
				Class jsonType = jsonValue.getClass();
				if (jsonType == JSONObject.class) {
					addToObject((JSONObject) jsonValue, propertyName, propertyValue);
				} else if (jsonType == JSONArray.class) {
					//Not supported to add primitive to array
					System.err.println("Not supported to add property to list");
				} else {
					System.out.println(
							"Add to json property of type " + jsonValue.getClass() + "...add sibling object");
					TreeItem parent = ((TreeItem) selectedItem).getParentItem();
					
					if (parent == null) {
						// selected item is child of root
						addToObject((JSONObject) treeViewer.getInput(), propertyName, propertyValue);
					} else {
						Object parentJSONObject = parent.getData();
						if (parentJSONObject.getClass() == SimpleEntry.class) {
							SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

							Object jsonParentValue = jsonParentElement.getValue();
							Class jsonParentType = jsonParentValue.getClass();
							if (jsonParentType == JSONObject.class) {
								addToObject((JSONObject) jsonParentValue, propertyName, propertyValue);
							} else { 
								// Not supported to add primitive to array
								System.err.println("Not supported to add property to list");
							}
						}
					}
				}
			} else {
				
				if(selectedJSONObject.getClass() == JSONObject.class) {
					addToObject((JSONObject) selectedJSONObject, propertyName, propertyValue);
				}
				else {
					System.out.println("property type " + selectedJSONObject.getClass() + "...add sibling object");
					TreeItem parent = ((TreeItem) selectedItem).getParentItem();

					if (parent == null) {
						// selected item is child of root
						addToObject((JSONObject) treeViewer.getInput(), propertyName, propertyValue);
					} else {
						Object parentJSONObject = parent.getData();
						if (parentJSONObject.getClass() == SimpleEntry.class) {
							SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

							Object jsonParentValue = jsonParentElement.getValue();
							Class jsonParentType = jsonParentValue.getClass();
							if (jsonParentType == JSONObject.class) {
								addToObject((JSONObject) jsonParentValue, propertyName, propertyValue);
							} else { 
								// Not supported to add primitive to array
								System.err.println("Not supported to add property to list");
							}
						}
					}
				}
			}
		}
		
		treeViewer.refresh();
	}
	
	
	
}

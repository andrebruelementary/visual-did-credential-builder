package com.elementarysoftware.vdcb.tree.actions;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.vdcb.AddPrimitiveDialog;

public class AddJSONPrimitiveAction extends JSONAction {

	TreeViewer treeViewer;
	
	public AddJSONPrimitiveAction(TreeViewer viewer) {
		super("Add Value");
		treeViewer = viewer;
	}

	@Override
	public void run() {
		
		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();
		
		Shell shell = new Shell();
		AddPrimitiveDialog dlg = new AddPrimitiveDialog(shell);
		dlg.open();
		
		if(dlg.getReturnCode() != Window.OK) {
			return;
		}
		
		String selectedType = dlg.getSelectedType();
		String primitiveValue = dlg.getPrimitiveValue();
		
		Object value;
		if(selectedType.equals(PRIMITIVE_TYPE_STRING)) {
			value = primitiveValue;
		}
		else if (selectedType.equals(PRIMITIVE_TYPE_INTEGER)) {
			value = Integer.parseInt(primitiveValue);
		}
		else if(selectedType.equals(PRIMITIVE_TYPE_DOUBLE)) {
			value = Double.parseDouble(primitiveValue);
		}
		else {
			System.err.println("Not supported primitive");
			return;
		}
		
		if (selectedTreeItems.length == 0) {
			// No tree item selected. Not supported to add primitive to object
			System.err.println("Not supported to add primitive to object");
		} else {
			TreeItem selectedItem = selectedTreeItems[0];
			Object selectedJSONObject = selectedItem.getData();
			if (selectedJSONObject.getClass() == SimpleEntry.class) {
				SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

				Object jsonValue = jsonElement.getValue();
				Class jsonType = jsonValue.getClass();
				if (jsonType == JSONObject.class) {
					//Not supported to add primitive to object
					System.err.println("Not supported to add primitive to object");
				} else if (jsonType == JSONArray.class) {
					addToArray((JSONArray) jsonValue, value);
				} else {
					System.out.println(
							"Add to json value of type " + jsonValue.getClass() + "...add sibling object");
					TreeItem parent = ((TreeItem) selectedItem).getParentItem();
					
					if (parent == null) {
						// Not supported to add primitive to object
						System.err.println("Not supported to add primitive to object");
					} else {
						Object parentJSONObject = parent.getData();
						if (parentJSONObject.getClass() == SimpleEntry.class) {
							SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

							Object jsonParentValue = jsonParentElement.getValue();
							Class jsonParentType = jsonParentValue.getClass();
							if (jsonParentType == JSONObject.class) {
								// Not supported to add primitive to object
								System.err.println("Not supported to add primitive to object");
							} else { 
								// element must be array...as a parent can only be Object or Array
								addToArray((JSONArray) jsonParentValue, value);
							}
						}
					}
				}
			} else {
				System.out.println("primitive type " + selectedJSONObject.getClass() + "...add sibling object");
				TreeItem parent = ((TreeItem) selectedItem).getParentItem();
				
				if (parent == null) {
					// selected item is child of root. Not supported to add primitive to object
					System.err.println("Not supported to add primitive to object");
				} else {
					Object parentJSONObject = parent.getData();
					if (parentJSONObject.getClass() == SimpleEntry.class) {
						SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

						Object jsonParentValue = jsonParentElement.getValue();
						Class jsonParentType = jsonParentValue.getClass();
						if (jsonParentType == JSONObject.class) {
							// Not supported to add primitive to object
							System.err.println("Not supported to add primitive to object");
						} else { 
							// element must be array...as a parent can only be Object or Array
							addToArray((JSONArray) jsonParentValue, value);
						}
					}
				}
			}
		}
		
		treeViewer.refresh();
	}
	
	
	
}

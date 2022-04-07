package com.elementarysoftware.vdcb.tree.actions;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.action.Action;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class JSONAction extends Action {

	public static final String PRIMITIVE_TYPE_STRING = "Text";
	public static final String PRIMITIVE_TYPE_INTEGER = "Integer";
	public static final String PRIMITIVE_TYPE_DOUBLE = "Floating Point";
	

	public JSONAction(String string) {
		super(string);
	}

	protected void addToObject(JSONObject object, String key, Object value) {
		object.put(key, value);
	}

	protected void addToArray(JSONArray array, Object value) {
		array.add(value);
	}
		
	protected void deleteFromObject(JSONObject object, String key) {
		object.remove(key);
	}
	
	protected void deleteFromArray(JSONArray array, Object value) {
		array.remove(value);
	}
	
	protected boolean selectedOrParentIsArray(TreeItem[] selectedTreeItems) {
		
		boolean arrayFound = false;
		
		if (selectedTreeItems.length == 0) {
			arrayFound = true;
		}
		else {
			TreeItem selectedItem = selectedTreeItems[0];
			Object selectedJSONObject = selectedItem.getData();
			if (selectedJSONObject.getClass() == SimpleEntry.class) {
				
				SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

				Object jsonValue = jsonElement.getValue();
				if(jsonValue.getClass() != JSONArray.class) {
					arrayFound = true;
				}
				else if(jsonValue.getClass() == JSONArray.class) {
					// askForName = false;
				}
				else {
					TreeItem parent = ((TreeItem) selectedItem).getParentItem();
					if (parent == null) {
						// selected item is child of root
						arrayFound = true;
					} else {
						Object parentJSONObject = parent.getData();
						if (parentJSONObject.getClass() == SimpleEntry.class) {
							SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

							Object jsonParentValue = jsonParentElement.getValue();
							if(jsonParentValue.getClass() != JSONArray.class) {
								arrayFound = true;
							}
						}
					}
				}
			}
			else {
				System.out.println("primitive type " + selectedJSONObject.getClass() + "...add sibling object");
				TreeItem parent = ((TreeItem) selectedItem).getParentItem();
				
				if (parent == null) {
					arrayFound = true;
				}
				else if(selectedJSONObject.getClass() == JSONArray.class) {
					// askForName = false;
				}
				else {
					Object parentJSONObject = parent.getData();
					if (parentJSONObject.getClass() == SimpleEntry.class) {
						SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

						Object jsonParentValue = jsonParentElement.getValue();
						if (jsonParentValue.getClass() != JSONArray.class) {
							arrayFound = true;
						}
					}
				}
			}
		}
		return arrayFound;
	}
	
}

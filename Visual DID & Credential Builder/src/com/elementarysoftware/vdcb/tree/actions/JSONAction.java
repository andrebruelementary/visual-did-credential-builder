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
	

	
	public static boolean selectedOrParentIsJSONArray(TreeItem[] selectedTreeItems) {
		
		boolean arrayFound = false;
		
		if (selectedTreeItems.length == 0) {
			//arrayFound = false;
		}
		else {
			TreeItem selectedItem = selectedTreeItems[0];
			Object selectedJSONObject = selectedItem.getData();
			if (selectedJSONObject.getClass() == SimpleEntry.class) {
				
				SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

				Object jsonValue = jsonElement.getValue();
				if(jsonValue.getClass() != JSONArray.class) {
					//arrayFound = false;
				}
				else if(jsonValue.getClass() == JSONArray.class) {
					arrayFound = true;
				}
				else {
					TreeItem parent = ((TreeItem) selectedItem).getParentItem();
					if (parent == null) {
						// selected item is child of root
						//arrayFound = false;
					} else {
						Object parentJSONObject = parent.getData();
						if (parentJSONObject.getClass() == SimpleEntry.class) {
							SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

							Object jsonParentValue = jsonParentElement.getValue();
							if(jsonParentValue.getClass() == JSONArray.class) {
								arrayFound = true;
							}
						}
					}
				}
			}
			else {
				TreeItem parent = ((TreeItem) selectedItem).getParentItem();
				
				if (parent == null) {
					//arrayFound = false;
				}
				else if(selectedJSONObject.getClass() == JSONArray.class) {
					arrayFound = true;
				}
				else {
					Object parentJSONObject = parent.getData();
					if (parentJSONObject.getClass() == SimpleEntry.class) {
						SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

						Object jsonParentValue = jsonParentElement.getValue();
						if (jsonParentValue.getClass() == JSONArray.class) {
							arrayFound = true;
						}
					}
				}
			}
		}
		return arrayFound;
	}
	
	public static boolean selectedIsJSONArray(TreeItem[] selectedTreeItems) {
		
		boolean arrayFound = false;
		
		if (selectedTreeItems.length == 0) {
			//arrayFound = false;
		}
		else {
			TreeItem selectedItem = selectedTreeItems[0];
			Object selectedJSONObject = selectedItem.getData();
			if (selectedJSONObject.getClass() == SimpleEntry.class) {
				
				SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

				Object jsonValue = jsonElement.getValue();
				if(jsonValue.getClass() == JSONArray.class) {
					arrayFound = true;
				}
			}
			else if(selectedJSONObject.getClass() == JSONArray.class) {
				arrayFound = true;
			}
		}
		return arrayFound;
	}
	
	public static boolean selectedOrParentIsJSONObject(TreeItem[] selectedTreeItems) {
		
		boolean objectFound = false;
		
		if (selectedTreeItems.length == 0) {
			objectFound = true;
		}
		else {
			TreeItem selectedItem = selectedTreeItems[0];
			Object selectedJSONObject = selectedItem.getData();
			if (selectedJSONObject.getClass() == SimpleEntry.class) {
				
				SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

				Object jsonValue = jsonElement.getValue();
				if(jsonValue.getClass() == JSONObject.class) {
					objectFound = true;
				}
				else {
					TreeItem parent = ((TreeItem) selectedItem).getParentItem();
					if (parent == null) {
						// selected item is child of root
						objectFound = true;
					} else {
						Object parentJSONObject = parent.getData();
						if (parentJSONObject.getClass() == SimpleEntry.class) {
							SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

							Object jsonParentValue = jsonParentElement.getValue();
							if(jsonParentValue.getClass() == JSONObject.class) {
								objectFound = true;
							}
						}
					}
				}
			}
			else {
				TreeItem parent = ((TreeItem) selectedItem).getParentItem();
				
				if (parent == null) {
					objectFound = true;
				}
				else if(selectedJSONObject.getClass() == JSONObject.class) {
					objectFound = true;
				}
				else {
					Object parentJSONObject = parent.getData();
					if (parentJSONObject.getClass() == SimpleEntry.class) {
						SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

						Object jsonParentValue = jsonParentElement.getValue();
						if (jsonParentValue.getClass() == JSONObject.class) {
							objectFound = true;
						}
					}
				}
			}
		}
		return objectFound;
	}
	
	public static boolean selectedIsProperty(TreeItem[] selectedTreeItems) {
		
		boolean propertyFound = false;
		
		
		TreeItem selectedItem = selectedTreeItems[0];
		Object selectedJSONObject = selectedItem.getData();
		if (selectedJSONObject.getClass() == SimpleEntry.class) {
			propertyFound = true;
		}
		
		return propertyFound;
	}
	
	public static boolean selectedIsValue(TreeItem[] selectedTreeItems) {
		
		boolean valueFound = false;
		
		TreeItem selectedItem = selectedTreeItems[0];
		Object selectedJSONObject = selectedItem.getData();
		if (selectedJSONObject instanceof String) {
			valueFound = true;
		}
		else if(selectedJSONObject instanceof Number) {
			valueFound = true;
		}
		
		return valueFound;
	}

	public static boolean selectedIsJSONObject(TreeItem[] selectedTreeItems) {
		boolean objectFound = false;
		
		
		TreeItem selectedItem = selectedTreeItems[0];
		Object selectedJSONObject = selectedItem.getData();
		if (selectedJSONObject.getClass() == SimpleEntry.class) {
			
			SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

			Object jsonValue = jsonElement.getValue();
			if(jsonValue.getClass() == JSONObject.class) {
				objectFound = true;
			}
		}
		else if(selectedJSONObject.getClass() == JSONObject.class) {
			objectFound = true;
		}
		
		return objectFound;
	}
	
}

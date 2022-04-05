package com.elementarysoftware.vdcb.tree.actions;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.action.Action;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class JSONAction extends Action {

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
	
}

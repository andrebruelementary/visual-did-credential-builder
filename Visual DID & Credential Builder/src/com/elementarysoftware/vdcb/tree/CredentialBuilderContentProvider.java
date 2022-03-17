package com.elementarysoftware.vdcb.tree;

import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.Vector;

import org.eclipse.jface.viewers.ITreeContentProvider;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import java.util.AbstractMap.SimpleEntry;

public class CredentialBuilderContentProvider implements ITreeContentProvider {

	@Override
	public Object[] getElements(Object inputElement) {
		System.out.println("getElements()");

		JSONObject jsonObj = (JSONObject) inputElement;
		Set<String> keys = jsonObj.keySet();
		List<SimpleEntry<String, Object>> jsonObjects = new Vector<SimpleEntry<String, Object>>();
		Iterator<String> it = keys.iterator();
		while (it.hasNext()) {
			String key = it.next().toString();
			System.out.println(key + " = " + jsonObj.get(key));
			SimpleEntry<String, Object> pair = new SimpleEntry<String, Object>(key, jsonObj.get(key));
			jsonObjects.add(pair);
		}

		return jsonObjects.toArray(SimpleEntry[]::new);
	}

	@Override
	public Object[] getChildren(Object parentElement) {
		if (parentElement.getClass() == SimpleEntry.class) {

			SimpleEntry<String, Object> entry = (SimpleEntry<String, Object>) parentElement;
			if (entry.getValue().getClass() == JSONArray.class) {
				return ((JSONArray) entry.getValue()).toArray();
			} else if (entry.getValue().getClass() == JSONObject.class) {
				JSONObject jsonObj = (JSONObject) entry.getValue();
				Set<String> keys = jsonObj.keySet();
				List<SimpleEntry<String, Object>> jsonObjects = new Vector<SimpleEntry<String, Object>>();
				Iterator<String> it = keys.iterator();
				while (it.hasNext()) {
					String key = it.next().toString();
					System.out.println(key + " = " + jsonObj.get(key));
					SimpleEntry<String, Object> pair = new SimpleEntry<String, Object>(key, jsonObj.get(key));
					jsonObjects.add(pair);
				}

				return jsonObjects.toArray(SimpleEntry[]::new);
			}
		} else {
			System.out.println("CredentialBuilderContentProvider: No getChildren() configured for "
					+ parentElement.getClass().toString());
		}

		return new Object[] {};
	}

	@Override
	public Object getParent(Object element) {
		System.out.println("getParent");
		return null;
	}

	@Override
	public boolean hasChildren(Object element) {
		Object[] obj = getChildren(element);
		return obj == null ? false : obj.length > 0;
	}

}

package com.elementarysoftware.vdcb.tree.actions;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.vdcb.ChangeItemValueDialog;

public class ChangeItemValueAction extends JSONAction {

	TreeViewer treeViewer;
	
	public ChangeItemValueAction(TreeViewer viewer) {
		super("Change value");
		treeViewer = viewer;
	}

	@Override
	public void run() {
		
		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();
		
		if (selectedTreeItems.length == 1) {
			TreeItem selectedItem = selectedTreeItems[0];
			if(changeItemValue(selectedItem)) {
				treeViewer.refresh();
			}
		}
	}
	
	private boolean changeItemValue(TreeItem sourceItem) {
		
		TreeItem sourceParentItem = sourceItem.getParentItem();
		
		boolean changeSuccessful = false;
		
		
		String newValue = "";
		String newValueType = "";
		Shell shell = new Shell();
		ChangeItemValueDialog  dlg = new ChangeItemValueDialog(shell, sourceItem);
		
		dlg.open();
		if(dlg.getReturnCode() != Window.OK) {
			return false;
		}
		newValue = dlg.getItemValue();
		newValueType = dlg.getSelectedType();
		
		Object value;
		if(newValueType.equals(PRIMITIVE_TYPE_STRING)) {
			value = newValue;
		}
		else if (newValueType.equals(PRIMITIVE_TYPE_INTEGER)) {
			value = Integer.parseInt(newValue);
		}
		else if(newValueType.equals(PRIMITIVE_TYPE_DOUBLE)) {
			value = Double.parseDouble(newValue);
		}
		else {
			System.err.println("Not supported value type");
			return false;
		}
		
		
		Object sourceJSONParent;
		if(sourceParentItem == null) { 
			System.out.println("Parent is root of tree viewer tree"); 
			sourceJSONParent = treeViewer.getInput();
		}
		else { 
			System.out.println("Parent is "+ sourceParentItem.getText());
			sourceJSONParent = sourceParentItem.getData();
			if (sourceJSONParent.getClass() == SimpleEntry.class) {
				sourceJSONParent = ((SimpleEntry)sourceJSONParent).getValue();
			}
		}

		
		if (sourceJSONParent.getClass() == JSONObject.class) {
			JSONObject jsonObjectParent = (JSONObject) sourceJSONParent;
			SimpleEntry<String, Object> sourceEntry = (SimpleEntry<String, Object>) sourceItem.getData();
			
			System.out.println("Changing SimpleEntry");
			jsonObjectParent.put(sourceEntry.getKey(), value);
			changeSuccessful = true;
			
		}
		else if(sourceJSONParent.getClass() == JSONArray.class) {
			
			int valueIndex = -1;
			JSONArray jsonArrayParent = (JSONArray) sourceJSONParent;
			Object oldData = sourceItem.getData();
			if(oldData instanceof String) {
				String tmpValue = (String) oldData;
				valueIndex = jsonArrayParent.indexOf(tmpValue);
			}
			else if(oldData instanceof Integer) {
				Integer tmpValue = (Integer) oldData;
				valueIndex = jsonArrayParent.indexOf(tmpValue);
			}
			else if(oldData instanceof Double) {
				Double tmpValue = (Double) oldData;
				valueIndex = jsonArrayParent.indexOf(tmpValue);
			}
			
			if(valueIndex > -1) {
				jsonArrayParent.remove(valueIndex);
				jsonArrayParent.add(valueIndex, value);
				changeSuccessful = true;
			}
			
		}
		else {
			System.err.println("Parent is not JSONObject or JSONArray");
		}
		
		return changeSuccessful;
		
	}
	
}

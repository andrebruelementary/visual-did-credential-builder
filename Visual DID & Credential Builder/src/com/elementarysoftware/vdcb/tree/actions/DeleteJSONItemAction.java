package com.elementarysoftware.vdcb.tree.actions;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.action.Action;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class DeleteJSONItemAction extends JSONAction {

	TreeViewer treeViewer;
	
	public DeleteJSONItemAction(TreeViewer viewer) {
		super("Delete");
		treeViewer = viewer;
	}

	@Override
	public void run() {
		
		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();
		
		if (selectedTreeItems.length == 0) {
			// No tree item selected. Delete complete JSON tree
			treeViewer.setInput(new JSONObject());
			treeViewer.refresh();
			
		} else {
			TreeItem selectedItem = selectedTreeItems[0];
			if(removeFromParent(selectedItem)) {
				treeViewer.refresh();
			}
		}
		
		
	}
	
	private boolean removeFromParent(TreeItem sourceItem) {
		
		TreeItem sourceParentItem = sourceItem.getParentItem();
		
		boolean removalSuccessful = false;
		
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

		if (sourceJSONParent.getClass() == JSONArray.class) {
			JSONArray jsonArrayParent = (JSONArray) sourceJSONParent;

			System.out.println("removing(1) "+ sourceItem.getData() +" from parent of "+ sourceItem.getText());
			if(jsonArrayParent.remove(sourceItem.getData())) {
				removalSuccessful = true;
			}
		} 
		else if (sourceJSONParent.getClass() == JSONObject.class) {
			JSONObject jsonObjectParent = (JSONObject) sourceJSONParent;
			SimpleEntry<String, Object> sourceEntry = (SimpleEntry<String, Object>) sourceItem.getData();
			System.out.println("removing(2) "+ sourceEntry.getKey() +" from parent of "+ sourceItem.getText());
			if(jsonObjectParent.remove(sourceEntry.getKey()) != null) {
				removalSuccessful = true;
			}

		}
		else {
			System.err.println("Parent is not JSON Object or JSON Array");
		}
		
		return removalSuccessful;
		
	}
	
}

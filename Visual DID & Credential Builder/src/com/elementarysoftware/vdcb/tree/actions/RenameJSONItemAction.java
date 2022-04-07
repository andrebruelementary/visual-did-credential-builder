package com.elementarysoftware.vdcb.tree.actions;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.action.Action;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.vdcb.AddArrayDialog;
import com.elementarysoftware.vdcb.RenameItemDialog;

public class RenameJSONItemAction extends JSONAction {

	TreeViewer treeViewer;
	
	public RenameJSONItemAction(TreeViewer viewer) {
		super("Rename");
		treeViewer = viewer;
	}

	@Override
	public void run() {
		
		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();
		
		if (selectedTreeItems.length == 1) {
			TreeItem selectedItem = selectedTreeItems[0];
			if(renameItem(selectedItem)) {
				treeViewer.refresh();
			}
		}
		
		
	}
	
	private boolean renameItem(TreeItem sourceItem) {
		
		TreeItem sourceParentItem = sourceItem.getParentItem();
		
		boolean removalSuccessful = false;
		
		
		String newName = "";
		Shell shell = new Shell();
		RenameItemDialog  dlg = new RenameItemDialog(shell, sourceItem);
		
		dlg.open();
		if(dlg.getReturnCode() != Window.OK) {
			return false;
		}
		newName = dlg.getItemName();
		
		
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
			Object deletedObject = jsonObjectParent.remove(sourceEntry.getKey());
			if(deletedObject instanceof SimpleEntry) {
				System.out.println("Renaming SimpleEntry");
				jsonObjectParent.put(newName, ((SimpleEntry)deletedObject).getValue());
				removalSuccessful = true;
			}
			else {
				System.out.println("Renaming Object");
				jsonObjectParent.put(newName, deletedObject);
				removalSuccessful = true;
			}
		}
		else {
			System.err.println("Parent is not JSON Object");
		}
		
		return removalSuccessful;
		
	}
	
}

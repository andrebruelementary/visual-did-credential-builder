package com.elementarysoftware.vdbc.listeners;

import org.eclipse.jface.action.IMenuListener;
import org.eclipse.jface.action.IMenuManager;
import org.eclipse.jface.action.MenuManager;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.widgets.TreeItem;
import com.elementarysoftware.vdcb.tree.actions.AddJSONArrayAction;
import com.elementarysoftware.vdcb.tree.actions.AddJSONObjectAction;
import com.elementarysoftware.vdcb.tree.actions.AddJSONPrimitiveAction;
import com.elementarysoftware.vdcb.tree.actions.AddJSONPropertyAction;
import com.elementarysoftware.vdcb.tree.actions.ChangeItemValueAction;
import com.elementarysoftware.vdcb.tree.actions.DeleteJSONItemAction;
import com.elementarysoftware.vdcb.tree.actions.JSONAction;
import com.elementarysoftware.vdcb.tree.actions.RenameJSONItemAction;

public class CredentialBuilderMenuListener implements IMenuListener {

	MenuManager contextMenu;
	TreeViewer treeViewer;

	public CredentialBuilderMenuListener(MenuManager ctxtMenu, TreeViewer viewer) {
		contextMenu = ctxtMenu;
		treeViewer = viewer;
	}

	@Override
	public void menuAboutToShow(IMenuManager manager) {

		
		AddJSONObjectAction addObjectAction = new AddJSONObjectAction(treeViewer);
		AddJSONArrayAction addArrayAction = new AddJSONArrayAction(treeViewer);
		AddJSONPropertyAction addPropertyAction = new AddJSONPropertyAction(treeViewer);
		AddJSONPrimitiveAction addPrimitiveAction = new AddJSONPrimitiveAction(treeViewer);
		DeleteJSONItemAction deleteItemAction = new DeleteJSONItemAction(treeViewer);
		RenameJSONItemAction renameItemAction = new RenameJSONItemAction(treeViewer);
		ChangeItemValueAction changeItemValueAction = new ChangeItemValueAction(treeViewer);
		
		// contextMenu.add(new GroupMarker(IWorkbenchActionConstants.MB_ADDITIONS));
		//IStructuredSelection selection = (IStructuredSelection) treeViewer.getSelection();

		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();
		
		if (selectedTreeItems.length == 0) {
			contextMenu.add(addObjectAction);
			contextMenu.add(addArrayAction);
			contextMenu.add(addPropertyAction);
			contextMenu.add(deleteItemAction);
		}
		else if(JSONAction.selectedIsJSONObject(selectedTreeItems)) {
			contextMenu.add(addObjectAction);
			contextMenu.add(addArrayAction);
			contextMenu.add(addPropertyAction);
			contextMenu.add(deleteItemAction);
		}
		else if(JSONAction.selectedIsJSONArray(selectedTreeItems)) {
			contextMenu.add(addObjectAction);
			contextMenu.add(addArrayAction);
			contextMenu.add(addPrimitiveAction);
			contextMenu.add(deleteItemAction);
		}
		else if(JSONAction.selectedIsProperty(selectedTreeItems)) {
			contextMenu.add(addObjectAction);
			contextMenu.add(addArrayAction);
			contextMenu.add(addPropertyAction);
			contextMenu.add(deleteItemAction);
		}
		else if(JSONAction.selectedIsValue(selectedTreeItems)) {
			contextMenu.add(addObjectAction);
			contextMenu.add(addArrayAction);
			contextMenu.add(addPrimitiveAction);
			contextMenu.add(deleteItemAction);
			contextMenu.add(changeItemValueAction);
		}
		else {
			System.err.println("Unknown type of element selected");
		}
		
		if (selectedTreeItems.length == 1) {
			if(JSONAction.selectedIsProperty(selectedTreeItems)) {
				contextMenu.add(renameItemAction);
				if(!JSONAction.selectedIsJSONArray(selectedTreeItems)) {
					contextMenu.add(changeItemValueAction);
				}
			}
		}
		
	}
}

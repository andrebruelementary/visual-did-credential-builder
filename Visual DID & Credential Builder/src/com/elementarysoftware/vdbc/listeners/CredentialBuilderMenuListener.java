package com.elementarysoftware.vdbc.listeners;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.action.IMenuListener;
import org.eclipse.jface.action.IMenuManager;
import org.eclipse.jface.action.MenuManager;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.vdcb.tree.actions.AddJSONArrayAction;
import com.elementarysoftware.vdcb.tree.actions.AddJSONObjectAction;
import com.elementarysoftware.vdcb.tree.actions.AddJSONPrimitiveAction;
import com.elementarysoftware.vdcb.tree.actions.AddJSONPropertyAction;
import com.elementarysoftware.vdcb.tree.actions.DeleteJSONItemAction;

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
		
		// contextMenu.add(new GroupMarker(IWorkbenchActionConstants.MB_ADDITIONS));
		//IStructuredSelection selection = (IStructuredSelection) treeViewer.getSelection();

		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();
		
		// determine the type of the selected object to show relevant actions supported by type
		if (selectedTreeItems.length == 0) {
			// No tree item selected. Added element will be child of root element, or deletion will remove all children of root element
			contextMenu.add(addObjectAction);
			contextMenu.add(addArrayAction);
			contextMenu.add(addPropertyAction);
			contextMenu.add(deleteItemAction);
		} else {
			TreeItem selectedItem = selectedTreeItems[0];
			Object selectedJSONObject = selectedItem.getData();
			if (selectedJSONObject.getClass() == SimpleEntry.class) {
				SimpleEntry jsonElement = (SimpleEntry) selectedJSONObject;

				Object jsonValue = jsonElement.getValue();
				Class jsonType = jsonValue.getClass();
				if (jsonType == JSONObject.class) {
					
					// Added element will be child of JSONObject element, or deletion will remove JSONObject and all children of element
					contextMenu.add(addObjectAction);
					contextMenu.add(addArrayAction);
					contextMenu.add(addPropertyAction);
					contextMenu.add(deleteItemAction);
					
				} else if (jsonType == JSONArray.class) {
					// Added element will be child of JSONArray element, or deletion will remove JSONArray and all children of element
					contextMenu.add(addObjectAction);
					contextMenu.add(addArrayAction);
					contextMenu.add(addPrimitiveAction);
					contextMenu.add(deleteItemAction);
				} else {
					System.out.println(
							"Add to json property of type " + jsonValue.getClass() + "...add sibling object");
					TreeItem parent = ((TreeItem) selectedItem).getParentItem();
					
					if (parent == null) {
						// Selected item is child of root. Added element will be child of root element, or deletion will remove all children of root element
						contextMenu.add(addObjectAction);
						contextMenu.add(addArrayAction);
						contextMenu.add(addPropertyAction);
						contextMenu.add(deleteItemAction);
					} else {
						Object parentJSONObject = parent.getData();
						if (parentJSONObject.getClass() == SimpleEntry.class) {
							SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

							Object jsonParentValue = jsonParentElement.getValue();
							Class jsonParentType = jsonParentValue.getClass();
							if (jsonParentType == JSONObject.class) {
								// Added element will be child of JSONObject element, or deletion will remove the selected element
								contextMenu.add(addObjectAction);
								contextMenu.add(addArrayAction);
								contextMenu.add(addPropertyAction);
								contextMenu.add(deleteItemAction);
							} else { 
								// element must be array...as a parent can only be Object or Array
								// Added element will be child of JSONArray element, or deletion will remove the selected element
								contextMenu.add(addObjectAction);
								contextMenu.add(addArrayAction);
								contextMenu.add(addPrimitiveAction);
								contextMenu.add(deleteItemAction);
							}
						}
					}
				}
			} else {
				System.out.println("primitive type " + selectedJSONObject.getClass() + "...add sibling object");
				TreeItem parent = ((TreeItem) selectedItem).getParentItem();
				
				if (parent == null) {
					// selected JSONObject is child of root
					// Added element will be child of JSONObject element, or deletion will remove the selected element
					contextMenu.add(addObjectAction);
					contextMenu.add(addArrayAction);
					contextMenu.add(addPropertyAction);
					contextMenu.add(deleteItemAction);
				} else {
					Object parentJSONObject = parent.getData();
					if (parentJSONObject.getClass() == SimpleEntry.class) {
						SimpleEntry jsonParentElement = (SimpleEntry) parentJSONObject;

						Object jsonParentValue = jsonParentElement.getValue();
						Class jsonParentType = jsonParentValue.getClass();
						if (jsonParentType == JSONObject.class) {
							// Added element will be child of JSONObject element, or deletion will remove the selected element
							contextMenu.add(addObjectAction);
							contextMenu.add(addArrayAction);
							contextMenu.add(addPropertyAction);
							contextMenu.add(deleteItemAction);
						} else { 
							// element must be array...as a parent can only be Object or Array
							// Added element will be child of JSONArray element, or deletion will remove the selected element
							contextMenu.add(addObjectAction);
							contextMenu.add(addArrayAction);
							contextMenu.add(addPrimitiveAction);
							contextMenu.add(deleteItemAction);
						}
					}
				}
			}
		}	
	}
}

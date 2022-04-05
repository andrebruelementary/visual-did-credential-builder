package com.elementarysoftware.vdbc.listeners;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.action.Action;
import org.eclipse.jface.action.GroupMarker;
import org.eclipse.jface.action.IMenuListener;
import org.eclipse.jface.action.IMenuManager;
import org.eclipse.jface.action.MenuManager;
import org.eclipse.jface.viewers.IStructuredSelection;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.widgets.TreeItem;
import org.eclipse.ui.IWorkbenchActionConstants;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.vdcb.tree.actions.AddJSONObjectAction;
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

		// contextMenu.add(new GroupMarker(IWorkbenchActionConstants.MB_ADDITIONS));
		IStructuredSelection selection = (IStructuredSelection) treeViewer.getSelection();

		TreeItem[] selectedTreeItems = treeViewer.getTree().getSelection();

		// Object sourceItem = selection.getFirstElement();

		contextMenu.add(new AddJSONObjectAction(treeViewer));

		contextMenu.add(new DeleteJSONItemAction(treeViewer));
	}

}

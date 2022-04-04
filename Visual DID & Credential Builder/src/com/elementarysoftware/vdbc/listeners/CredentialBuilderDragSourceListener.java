package com.elementarysoftware.vdbc.listeners;

import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.Vector;
import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.util.LocalSelectionTransfer;
import org.eclipse.jface.viewers.ISelection;
import org.eclipse.jface.viewers.IStructuredSelection;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.dnd.DND;
import org.eclipse.swt.dnd.DragSourceEvent;
import org.eclipse.swt.dnd.DragSourceListener;
import org.eclipse.swt.dnd.DropTargetEvent;
import org.eclipse.swt.dnd.DropTargetListener;
import org.eclipse.swt.dnd.TransferData;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class CredentialBuilderDragSourceListener implements DragSourceListener {

	TreeItem dragSourceItem = null;
	TreeViewer viewer = null;
	
	public CredentialBuilderDragSourceListener(TreeViewer v) {
		super();
		viewer = v;
	}

	@Override
	public void dragStart(DragSourceEvent event) {
		TreeItem[] selection = viewer.getTree().getSelection();
		event.doit = true;
		dragSourceItem = selection[0];
		System.out.println("dragStart: "+ dragSourceItem.getText());
	}

	@Override
	public void dragFinished(DragSourceEvent event) {
		dragSourceItem = null;
	}

	@Override
	public void dragSetData(DragSourceEvent event) {
		event.data = dragSourceItem;
		System.out.println("dragSetData: "+ event.data.toString());
	}

}

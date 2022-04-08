package com.elementarysoftware.vdbc.listeners;

import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.util.LocalSelectionTransfer;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.SWT;
import org.eclipse.swt.dnd.DND;
import org.eclipse.swt.dnd.DropTargetEvent;
import org.eclipse.swt.dnd.DropTargetListener;
import org.eclipse.swt.widgets.TreeItem;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class CredentialBuilderDropTargetListener implements DropTargetListener {

	private TreeViewer viewer;
	
	
	public CredentialBuilderDropTargetListener(TreeViewer v) {
		super();
		viewer = v;
	}

	@Override
	public void dragEnter(DropTargetEvent event) {
		// specify that we're only interested in copying data
		event.detail = DND.DROP_COPY;
	}

	@Override
	public void dragLeave(DropTargetEvent event) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void dragOperationChanged(DropTargetEvent event) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void dragOver(DropTargetEvent event) {
		event.feedback = DND.FEEDBACK_EXPAND | DND.FEEDBACK_SCROLL | DND.FEEDBACK_SELECT;
	}

	private boolean handleDropOnList(TreeItem sourceItem, TreeItem targetItem) {
		
		//SimpleEntry<String, Object> sourceEntry = (SimpleEntry<String, Object>) sourceItem.getData();
		SimpleEntry<String, Object> targetEntry = (SimpleEntry<String, Object>) targetItem.getData();
		boolean dropSuccessful = false;

		JSONArray jsonArray = (JSONArray) targetEntry.getValue();

		// adding source element on target element
		jsonArray.add(sourceItem.getData());

		dropSuccessful = removeFromParent(sourceItem);

		return dropSuccessful;
	}
	
	private boolean handleDropOnObject(TreeItem sourceItem, TreeItem targetItem) {
		
		SimpleEntry<String, Object> sourceEntry = (SimpleEntry<String, Object>) sourceItem.getData();
		SimpleEntry<String, Object> targetEntry = (SimpleEntry<String, Object>) targetItem.getData();
		boolean dropSuccessful = false;

		JSONObject jsonObject = (JSONObject) targetEntry.getValue();
		jsonObject.put(sourceEntry.getKey(), sourceEntry.getValue());
		
		dropSuccessful = removeFromParent(sourceItem);
			
		return dropSuccessful;
	}
	
private boolean removeFromParent(TreeItem sourceItem) {
		
		TreeItem sourceParentItem = sourceItem.getParentItem();
		
		boolean removalSuccessful = false;
		
		Object sourceJSONParent;
		if(sourceParentItem == null) { 
			System.out.println("Parent is root of tree viewer tree"); 
			sourceJSONParent = viewer.getInput();
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
	
	private boolean handleDropOnNumberOrText(TreeItem sourceItem, TreeItem targetItem) {

		// add source as target sibling
		TreeItem targetParentItem = targetItem.getParentItem();
		
		
		boolean dropSuccessful = false;
		
		Object targetJSONParent;
		if(targetParentItem == null) { 
			System.out.println("Parent is root of tree viewer tree"); 
			targetJSONParent = viewer.getInput();
		}
		else { 
			System.out.println("Parent is "+ targetParentItem.getText());
			targetJSONParent = targetParentItem.getData();
		}
		
		if (targetJSONParent.getClass() == JSONArray.class) {
			JSONArray jsonArrayParent = (JSONArray) targetJSONParent;
			jsonArrayParent.add(sourceItem.getData());
			dropSuccessful = true;
		} 
		else if (targetJSONParent.getClass() == JSONObject.class) {
			JSONObject jsonObjectParent = (JSONObject) targetJSONParent;
			SimpleEntry<String, Object> sourceEntry = (SimpleEntry<String, Object>) sourceItem.getData();
			jsonObjectParent.put(sourceItem.getText(), sourceEntry);
			dropSuccessful = true;

		}
		else {
			System.err.println("Parent is not JSON Object or JSON Array");
		}
		
		if(dropSuccessful) {
			dropSuccessful = removeFromParent(sourceItem);
		}
		
		return dropSuccessful;

	}
	
	@Override
	public void drop(DropTargetEvent event) {
		System.out.println("Drop detected on " + ((TreeItem) event.item).getText());

		LocalSelectionTransfer transfer = LocalSelectionTransfer.getTransfer();
		if (!transfer.isSupportedType(event.currentDataType)) { return; }
			
		// Target
		TreeItem targetItem = (TreeItem) event.item;

		System.out.println("Drop targetObject: " + targetItem.getText());
		System.out.println("Drop targetObject data: " + targetItem.getData().getClass());
		
		// Source
		TreeItem[] selection = viewer.getTree().getSelection();
		TreeItem sourceItem = selection[0];
		
		System.out.println("Drop sourceObject: " + sourceItem.getData().getClass());
		if (sourceItem.getData().getClass() == SimpleEntry.class) {

			if (targetItem.getData().getClass() == SimpleEntry.class) {
				SimpleEntry<String, Object> targetEntry = (SimpleEntry<String, Object>) targetItem.getData();
				if (targetEntry.getValue().getClass() == JSONArray.class) {
					handleDropOnList(sourceItem, targetItem);
				} 
				else if (targetEntry.getValue().getClass() == JSONObject.class) {
					handleDropOnObject(sourceItem, targetItem);
				}
			}
			else {
				handleDropOnNumberOrText(sourceItem,targetItem);
			}
		} else {
			System.out.println("not SimpleEntry");
			
			if (targetItem.getData().getClass() == SimpleEntry.class) {
				SimpleEntry<String, Object> targetEntry = (SimpleEntry<String, Object>) targetItem.getData();
				if (targetEntry.getValue().getClass() == JSONArray.class) {
					handleDropOnList(sourceItem, targetItem);
				} 
				else if (targetEntry.getValue().getClass() == JSONObject.class) {
					TreeItem sourceAsProperty = new TreeItem(sourceItem.getParentItem(), SWT.NONE);
					sourceAsProperty.setText("New property");
					sourceAsProperty.setData(sourceItem.getData());
					
					if(removeFromParent(sourceItem)) {
						handleDropOnObject(sourceAsProperty, targetItem);
					}
				}
			}
			else {
				handleDropOnNumberOrText(sourceItem,targetItem);
			}
			
			
		}
		
		viewer.refresh();
		
	}

	@Override
	public void dropAccept(DropTargetEvent event) {
		// Specify which data type we want to receive
//		for( int i = 0; i < event.dataTypes.length; i++ ) {
//			TransferData curType = event.dataTypes[i];
//			// Order we'd prefer to accept items
//			// However, the source of the drag determines its own preference.
//			// It does this by placing its preferred data type as the first element
//			// in the event.dataTypes array.
//			// Therefore, our preference may not reflect what is actually dropped.
//			if( LocalSelectionTransfer.getTransfer().isSupportedType(curType))  {
//				event.currentDataType = event.dataTypes[i];
//				break;
//			}			
//		}
		
		/*
		final TreeItem targetObject = (TreeItem) event.item;
		
		
		System.out.println("dropAccept targetObject: "+ targetObject.getText());
		System.out.println("dropAccept targetObject data: "+ targetObject.getData().getClass());
		
		if (targetObject.getData().getClass() == SimpleEntry.class) {

			SimpleEntry<String, Object> entry = (SimpleEntry<String, Object>) targetObject.getData();
			System.out.println("target type "+ entry.getValue().getClass());
			
			if (entry.getValue().getClass() == JSONArray.class) {
				System.out.println("Dropping on JSONArray "+ entry.getKey());
			} 
			else if (entry.getValue().getClass() == JSONObject.class) {
				System.out.println("Dropping on JSONObject "+ entry.getKey());
			}
			else {
				System.out.println("Drop not supported on target of type"+ entry.getValue().getClass());
				event.detail = DND.DROP_NONE;
			}
			
		} else {
			System.out.println("Drop not supported on target of type"+ targetObject.getData().getClass());
			event.detail = DND.DROP_NONE;
		}
		*/
	}

}

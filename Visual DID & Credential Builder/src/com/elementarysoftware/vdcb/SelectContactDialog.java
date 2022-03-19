package com.elementarysoftware.vdcb;

import java.util.HashMap;
import java.util.Iterator;

import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Shell;

import com.elementarysoftware.prism.Contact;

import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.List;
import org.eclipse.jface.viewers.ListViewer;
import org.eclipse.swt.layout.GridData;

public class SelectContactDialog extends Dialog {

	private HashMap<String, Contact> allContacts;
	private Contact selectedContact;
	private List listOfContacts;
	
	public Contact getSelectedContact() {
		return selectedContact;
	}

	/**
	 * Create the dialog.
	 * @param parentShell
	 */
	public SelectContactDialog(Shell parentShell, HashMap<String,Contact> contacts) {
		super(parentShell);
		allContacts = contacts;
	}

	/**
	 * Create contents of the dialog.
	 * @param parent
	 */
	@Override
	protected Control createDialogArea(Composite parent) {
		Composite container = (Composite) super.createDialogArea(parent);
		
		Label lblListOfContacts = new Label(container, SWT.NONE);
		lblListOfContacts.setText("List of contacts");
		
		ListViewer listViewer = new ListViewer(container, SWT.BORDER | SWT.V_SCROLL);
		listOfContacts = listViewer.getList();
		GridData gd_listOfContacts = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_listOfContacts.heightHint = 130;
		gd_listOfContacts.widthHint = 411;
		listOfContacts.setLayoutData(gd_listOfContacts);

		
		// remove all contacts from the list and add contacts for currently loaded DID
		//listOfContacts.removeAll();
		Iterator<String> it = allContacts.keySet().iterator();
		while(it.hasNext()) {
			String name = it.next();
			listOfContacts.add(name);
		}
		
		return container;
	}

	
	
	@Override
	protected void okPressed() {
		
		String contactName = listOfContacts.getItem(listOfContacts.getSelectionIndex());
		selectedContact = allContacts.get(contactName);

		super.okPressed();
	}

	/**
	 * Create contents of the button bar.
	 * @param parent
	 */
	@Override
	protected void createButtonsForButtonBar(Composite parent) {
		createButton(parent, IDialogConstants.OK_ID, IDialogConstants.OK_LABEL, true);
		createButton(parent, IDialogConstants.CANCEL_ID, IDialogConstants.CANCEL_LABEL, false);
	}

	/**
	 * Return the initial size of the dialog.
	 */
	@Override
	protected Point getInitialSize() {
		return new Point(450, 300);
	}

}

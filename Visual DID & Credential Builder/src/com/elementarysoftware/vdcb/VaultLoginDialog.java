package com.elementarysoftware.vdcb;

import java.io.FileNotFoundException;
import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.Shell;

import com.elementarysoftware.prism.Contact;
import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.DIDVault;

import org.eclipse.swt.widgets.Text;

public class VaultLoginDialog extends Dialog {

	private Text tfVaultPassphrase;
	Settings settings;
	private String passphrase;
	//private DID currentDID;
	//private Contact createdContact;

	/**
	 * Create the dialog.
	 * 
	 * @param parentShell
	 */
	public VaultLoginDialog(Shell parentShell, Settings s) {
		super(parentShell);
		settings = s;
		//currentDID = (DID) settings.get(Session.CURRENT_DID);
	}
	
	@Override
	protected void configureShell(Shell newShell) {
		// TODO Auto-generated method stub
		super.configureShell(newShell);
		newShell.setText("Vault login - Enter passphrase");
	}

	/**
	 * Create contents of the dialog.
	 * 
	 * @param parent
	 */
	@Override
	protected Control createDialogArea(Composite parent) {
		Composite container = (Composite) super.createDialogArea(parent);
		GridLayout gridLayout = (GridLayout) container.getLayout();
		gridLayout.numColumns = 2;

		Label lblPassphrase = new Label(container, SWT.NONE);
		lblPassphrase.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblPassphrase.setText("Passphrase:");

		tfVaultPassphrase = new Text(container, SWT.BORDER | SWT.PASSWORD);
		tfVaultPassphrase.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));

		return container;
	}

	/**
	 * Create contents of the button bar.
	 * 
	 * @param parent
	 */
	@Override
	protected void createButtonsForButtonBar(Composite parent) {
		Button button = createButton(parent, IDialogConstants.OK_ID, IDialogConstants.OK_LABEL, true);
		button.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
			}
		});
		createButton(parent, IDialogConstants.CANCEL_ID, IDialogConstants.CANCEL_LABEL, false);
	}

	@Override
	protected void okPressed() {

		passphrase = tfVaultPassphrase.getText().trim();
		
		if(passphrase.equals("")) {
			MessageDialog.openError(getShell(), "No passphrase provided", "Please type passphrase to login to vault");
			return;
		}	
		super.okPressed();
	}
	
	@Override
	protected void cancelPressed() {
		passphrase = "";
		super.cancelPressed();
	}

	/**
	 * Return the initial size of the dialog.
	 */
	@Override
	protected Point getInitialSize() {
		return new Point(300, 150);
	}

	public String getPassphrase() {
		return passphrase;
	}

}

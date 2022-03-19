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

public class CreateNewContactDialog extends Dialog {

	private Text tfContactName;
	private Text tfDIDString;
	private DID currentDID;
	private Contact createdContact;

	/**
	 * Create the dialog.
	 * 
	 * @param parentShell
	 */
	public CreateNewContactDialog(Shell parentShell, DID d) {
		super(parentShell);
		currentDID = d;
	}

	public Contact getCreatedContact() {
		return createdContact;
	}

	@Override
	protected void configureShell(Shell newShell) {
		// TODO Auto-generated method stub
		super.configureShell(newShell);
		newShell.setText("New Contact - Create dialog");
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
		gridLayout.numColumns = 3;

		Label lblName = new Label(container, SWT.NONE);
		lblName.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblName.setText("Name:");

		tfContactName = new Text(container, SWT.BORDER);
		tfContactName.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
		new Label(container, SWT.NONE);
		
		Label lblDidString = new Label(container, SWT.NONE);
		lblDidString.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblDidString.setText("DID String:");
		
				tfDIDString = new Text(container, SWT.BORDER);
				GridData gd_tfDIDString = new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1);
				gd_tfDIDString.widthHint = 362;
				tfDIDString.setLayoutData(gd_tfDIDString);
				new Label(container, SWT.NONE);

		/*
		 * //String [] seedPhrases = BIP0039SeedPhrases.getBIP0039Phrases();
		 * KeyDerivation keyder = KeyDerivation.INSTANCE; List<String> validWords =
		 * keyder.getValidMnemonicWords(); String[] seedPhrases =
		 * validWords.toArray(String[]::new);
		 * 
		 * 
		 * for(int i = 1; i <= PHRASES_IN_SEED; i++) {
		 * 
		 * 
		 * Label label = new Label(container, SWT.NONE); label.setLayoutData(new
		 * GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1)); label.setText(""+i);
		 * 
		 * Combo combo = new Combo(container, SWT.NONE); combo.setLayoutData(new
		 * GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
		 * combo.setItems(seedPhrases); new AutoCompleteField(combo, new
		 * ComboContentAdapter(), seedPhrases);
		 * 
		 * seedPhraseFields[i-1] = combo;
		 * 
		 * 
		 * }
		 */

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

		try {
			//DIDVault didVault = new DIDVault();
			//createdDID = didVault.createNewDID(tfDIDName.getText(), tfDIDString.getText());
			
			if(currentDID.hasContact(tfContactName.getText())) {
				MessageDialog.openError(getShell(), "Contact already exists", "A contact with the name "+ tfContactName.getText() +" already exists. Please verify if the existing contact is the correct one, or select a new name for the Contact you try to create");
				return;
			}
			
			DIDLongFormValidator validator = new DIDLongFormValidator();
			String validationMessage = validator.isValid(tfDIDString.getText());
			if(validationMessage != null) {
				MessageDialog.openError(getShell(), "DID String validation failed", validationMessage);
				return;
			}
			
			// if this point is reached...validation succeeded...create new Contact
			if(currentDID.addContact(tfDIDString.getText(), tfContactName.getText())) {
				createdContact = currentDID.getContact(tfContactName.getText());
				super.okPressed();
			}
			else {
				MessageDialog.openError(getShell(), "Contact was not created", "Creation of contact failed. Please retry.");
				return;
			}
			
			
		//} catch (FileNotFoundException fnfe) {
		//	MessageDialog.openError(getShell(), "Error occurred", fnfe.getMessage());
		} catch (Exception cse) {

			if (cse.getClass().equals(io.iohk.atala.prism.crypto.derivation.MnemonicChecksumException.class)) {
				MessageDialog.openError(getShell(), "Error occurred",
						"The provided seed phrase words has invalid checksum. Please verify you supplied the correct words");
			}

			System.err.println(cse.getClass().toString() + " " + cse.getMessage());

		}

	}

	/**
	 * Return the initial size of the dialog.
	 */
	@Override
	protected Point getInitialSize() {
		return new Point(450, 200);
	}

}

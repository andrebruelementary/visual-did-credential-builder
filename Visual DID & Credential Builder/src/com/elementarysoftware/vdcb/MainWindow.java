package com.elementarysoftware.vdcb;

import java.io.FileNotFoundException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Properties;

import org.eclipse.jface.dialogs.IInputValidator;
import org.eclipse.jface.dialogs.InputDialog;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.window.Window;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Display;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.List;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.Text;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.elementarysoftware.prism.Batch;
import com.elementarysoftware.prism.Contact;
import com.elementarysoftware.prism.Credential;
import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.DIDVault;

import io.iohk.atala.prism.identity.PrismDid;

public class MainWindow {

	protected Shell shlVisualDid;
	private Text text;
	private Label displayCurrentDIDName;
	private Label displayCurrentDIDStatus;
	//protected DID loadedDID;
	// private Button btnPublishDid;
	// private Button btnUpdateDid;
	private Button btnViewDid;
	private Button btnCredentialActions;
	private Button btnNewContact;
	private List listOfContacts;
	
	private Settings settings;
	private Button btnAlterDidTable;
	private Button btnSetOpHash;
	private Button btnGetOpHash;

	/**
	 * Launch the application.
	 * 
	 * @param args
	 */
	public static void main(String[] args) {
		try {
			MainWindow window = new MainWindow();
			window.open();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void setCurrentDID(DID did, String passphrase) {
		//this.loadedDID = did;

		settings.put(Session.CURRENT_DID, did);
		settings.put(Session.PASSPHRASE, passphrase);
		settings.put(Session.VAULT_JDBC_URL, did.getName());
		did.updateSettings(settings);
		
		// System.out.println("Current DID = "+ loadedDID.getName());
		displayCurrentDIDName.setText(did.getName());
		// btnPublishDid.setEnabled(false);
		// btnUpdateDid.setEnabled(false);
		btnViewDid.setEnabled(did != null);
		btnNewContact.setEnabled(did != null);
		btnCredentialActions.setEnabled(did != null);

		int published_status = did.getStatus();
		if (published_status == DID.STATUS_PUBLISHED) {
			displayCurrentDIDStatus.setText("Published");
			// btnUpdateDid.setEnabled(true);

		} else if (published_status == DID.STATUS_UNPUBLISHED) {
			displayCurrentDIDStatus.setText("Unpublished");
			// btnPublishDid.setEnabled(true);
		} else {
			displayCurrentDIDStatus.setText("Unknown");
		}
		
		if(did != null) {
			// remove all contacts from the list and add contacts for currently loaded DID
			listOfContacts.removeAll();
			Iterator<String> it = did.getContacts().keySet().iterator();
			while(it.hasNext()) {
				String name = it.next();
				listOfContacts.add(name);
			}
		}
		
	}

	/**
	 * Open the window.
	 */
	public void open() {
		Display.setAppName("Visual DID & Credential Builder");
		Display display = Display.getDefault();
		
		settings = new Settings();
		
		createContents();
		shlVisualDid.open();
		shlVisualDid.layout();

		while (!shlVisualDid.isDisposed()) {
			if (!display.readAndDispatch()) {
				display.sleep();
			}
		}
	}

	protected void openDIDSelectionDialog() {

		Shell dialogShell = new Shell();
		DialogSelectDID didDialog = new DialogSelectDID(dialogShell, SWT.APPLICATION_MODAL | SWT.DIALOG_TRIM, settings);
		didDialog.open();

		while (!didDialog.shell.isDisposed()) {
			if (!didDialog.shell.getDisplay().readAndDispatch()) {
				didDialog.shell.getDisplay().sleep();
			}
		}

		Shell loginShell = new Shell();
		VaultLoginDialog loginDlg = new VaultLoginDialog(loginShell, settings);
		
		if(loginDlg.open() == Window.OK) {
		
			String passphrase = loginDlg.getPassphrase();
			if(!passphrase.equals("")) {
				setCurrentDID((DID) didDialog.result, passphrase);
			}
		}
		

	}

	protected void openDIDPropertyPage() {
		
		Shell propertyShell = new Shell();
		DIDPropertyPage didDialog = new DIDPropertyPage(propertyShell, settings);
		didDialog.open();

	}

	protected void openDIDCredentialsPage() {
		
		Shell credentialsShell = new Shell();
		DIDCredentialsPage credentialsDialog = new DIDCredentialsPage(credentialsShell, settings);
		credentialsDialog.open();
	}

	/**
	 * Create contents of the window.
	 */
	protected void createContents() {
		shlVisualDid = new Shell();
		shlVisualDid.setSize(450, 300);
		shlVisualDid.setText("Visual DID & Credential Builder");

		listOfContacts = new List(shlVisualDid, SWT.BORDER);
		//listOfContacts.setItems(new String[] { "Alice", "Bob", "Charlie", "University", "Work", "Doctor" });
		
		listOfContacts.setBounds(10, 37, 140, 198);

		btnNewContact = new Button(shlVisualDid, SWT.NONE);
		btnNewContact.setEnabled(false);
		btnNewContact.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				createNewContact();
			}
		});
		btnNewContact.setBounds(10, 241, 140, 27);
		btnNewContact.setText("New Contact");

		text = new Text(shlVisualDid, SWT.BORDER);
		text.setToolTipText("Search contacts");
		text.setBounds(10, 10, 140, 19);

		btnCredentialActions = new Button(shlVisualDid, SWT.NONE);
		btnCredentialActions.setEnabled(false);
		btnCredentialActions.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				openDIDCredentialsPage();
			}
		});
		btnCredentialActions.setBounds(281, 7, 159, 27);
		btnCredentialActions.setText("Credential Actions");

		Label label = new Label(shlVisualDid, SWT.SEPARATOR | SWT.VERTICAL);
		label.setBounds(156, 10, 2, 258);

		Label lblDIDName = new Label(shlVisualDid, SWT.NONE);
		lblDIDName.setBounds(164, 221, 81, 14);
		lblDIDName.setText("Current DID:");

		displayCurrentDIDName = new Label(shlVisualDid, SWT.NONE);
		displayCurrentDIDName.setBounds(251, 216, 148, 19);

		Label lblDIDStatus = new Label(shlVisualDid, SWT.NONE);
		lblDIDStatus.setBounds(167, 247, 78, 14);
		lblDIDStatus.setText("DID Status:");

		displayCurrentDIDStatus = new Label(shlVisualDid, SWT.NONE);
		displayCurrentDIDStatus.setBounds(251, 241, 148, 21);

		Button btnSelectDid = new Button(shlVisualDid, SWT.NONE);
		btnSelectDid.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				openDIDSelectionDialog();
			}
		});
		btnSelectDid.setBounds(281, 103, 159, 27);
		btnSelectDid.setText("Select or Create DID");

		btnViewDid = new Button(shlVisualDid, SWT.NONE);
		btnViewDid.setEnabled(false);
		btnViewDid.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				openDIDPropertyPage();
			}
		});
		btnViewDid.setBounds(281, 136, 159, 27);
		btnViewDid.setText("DID Actions");
		
//		btnAlterDidTable = new Button(shlVisualDid, SWT.NONE);
//		btnAlterDidTable.addSelectionListener(new SelectionAdapter() {
//			@Override
//			public void widgetSelected(SelectionEvent e) {
//				Properties props = (Properties) settings.get(Session.VAULT_PROPERTIES); 
//				String vaultURL = (String) settings.get(Session.VAULT_JDBC_URL);
//				System.out.println("Alter did table, vault jdbc url = "+ vaultURL);
//				Connection conn;
//				try {
//					conn = DriverManager.getConnection(vaultURL, props);
//					
//					String updateQuery = "ALTER TABLE did ADD latest_operation_hash CHAR(64)";
//					try {
//						PreparedStatement updateStmt = conn.prepareStatement(updateQuery);
//						
//						updateStmt.executeUpdate();
//						
//						updateStmt.close();
//						
//						conn.close();
//					} catch (SQLException se) {
//						se.printStackTrace();
//					} 
//					
//				} catch (SQLException e1) {
//					e1.printStackTrace();
//				}
//			}
//		});
//		btnAlterDidTable.setBounds(164, 40, 159, 27);
//		btnAlterDidTable.setText("Alter did table");
		
//		btnSetOpHash = new Button(shlVisualDid, SWT.NONE);
//		btnSetOpHash.addSelectionListener(new SelectionAdapter() {
//			@Override
//			public void widgetSelected(SelectionEvent e) {
//				
//				DID did = (DID) settings.get(Session.CURRENT_DID);
//				did.setLatestOperationHash("fad70010dab41fbb411e72f0ab9ae49cea8a49cc853438fd6949bded2e8a046f");
//				
//				
//				//System.out.println(""did.getLatestOperationHash());
//				
//			}
//		});
//		btnSetOpHash.setBounds(164, 83, 94, 27);
//		btnSetOpHash.setText("set op hash");
		
//		btnGetOpHash = new Button(shlVisualDid, SWT.NONE);
//		btnGetOpHash.addSelectionListener(new SelectionAdapter() {
//			@Override
//			public void widgetSelected(SelectionEvent e) {
//				
//				DID did = (DID) settings.get(Session.CURRENT_DID);
//				System.out.println("op hash = "+ did.getLatestOperationHash());
//				
//			}
//		});
//		btnGetOpHash.setBounds(164, 116, 94, 27);
//		btnGetOpHash.setText("get op hash");
		
	}

	protected void createNewContact() {
		
		CreateNewContactDialog createContactDlg = new CreateNewContactDialog(shlVisualDid, settings); //, "New contact...", "Please provide long form string of DID to add to your contacts list.", "did:prism:XXXXXXXX:XXXXX", new DIDLongFormValidator());
		createContactDlg.open();
		
		listOfContacts.add(createContactDlg.getCreatedContact().getName());
		
		//System.out.println("did long form input "+ createContactDlg.getValue());
		//PrismDid prismDID = PrismDid.fromString(createContactDlg.getValue());
		
		//loadedDID.addContact(createContactDlg.getValue(), createContactDlg.getContactName());
		
	}
}

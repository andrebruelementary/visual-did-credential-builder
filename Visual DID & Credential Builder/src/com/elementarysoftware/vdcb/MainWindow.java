package com.elementarysoftware.vdcb;

import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Display;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.List;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.Text;

import com.elementarysoftware.prism.DID;

public class MainWindow {

	protected Shell shlVisualDid;
	private Text text;
	private Label displayCurrentDIDName;
	private Label displayCurrentDIDStatus;
	protected DID loadedDID;
	// private Button btnPublishDid;
	// private Button btnUpdateDid;
	private Button btnViewDid;
	private Button btnCredentialActions;

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

	public void setCurrentDID(DID did) {
		this.loadedDID = did;

		// System.out.println("Current DID = "+ loadedDID.getName());
		displayCurrentDIDName.setText(loadedDID.getName());
		// btnPublishDid.setEnabled(false);
		// btnUpdateDid.setEnabled(false);
		btnViewDid.setEnabled(did != null);
		btnCredentialActions.setEnabled(did != null);

		int published_status = loadedDID.getStatus();
		if (published_status == DID.STATUS_PUBLISHED) {
			displayCurrentDIDStatus.setText("Published");
			// btnUpdateDid.setEnabled(true);

		} else if (published_status == DID.STATUS_UNPUBLISHED) {
			displayCurrentDIDStatus.setText("Unpublished");
			// btnPublishDid.setEnabled(true);
		} else {
			displayCurrentDIDStatus.setText("Unknown");
		}
	}

	/**
	 * Open the window.
	 */
	public void open() {
		Display.setAppName("Visual DID & credential builder");
		Display display = Display.getDefault();

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
		DialogSelectDID didDialog = new DialogSelectDID(dialogShell, SWT.APPLICATION_MODAL | SWT.DIALOG_TRIM);
		didDialog.open();

		while (!didDialog.shell.isDisposed()) {
			if (!didDialog.shell.getDisplay().readAndDispatch()) {
				didDialog.shell.getDisplay().sleep();
			}
		}

		setCurrentDID((DID) didDialog.result);

	}

	protected void openDIDProperyPage() {

		Shell propertyShell = new Shell();
		DIDPropertyPage didDialog = new DIDPropertyPage(propertyShell, loadedDID);
		didDialog.open();

		/*
		 * while (!didDialog.getShell().isDisposed()) { if
		 * (!didDialog.getShell().getDisplay().readAndDispatch()) {
		 * didDialog.getShell().getDisplay().sleep(); } }
		 */

		// setCurrentDID((DID) didDialog.result);

	}

	protected void openDIDCredentialsPage() {
		Shell credentialsShell = new Shell();
		DIDCredentialsPage credentialsDialog = new DIDCredentialsPage(credentialsShell, loadedDID);
		credentialsDialog.open();
	}

	/**
	 * Create contents of the window.
	 */
	protected void createContents() {
		shlVisualDid = new Shell();
		shlVisualDid.setSize(450, 300);
		shlVisualDid.setText("Visual DID & credential builder");

		List list = new List(shlVisualDid, SWT.BORDER);
		list.setItems(new String[] { "Alice", "Bob", "Charlie", "University", "Work", "Doctor" });
		list.setBounds(10, 37, 140, 198);

		Button btnNewContact = new Button(shlVisualDid, SWT.NONE);
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

		/*
		 * Button btnIssueCredential = new Button(shlVisualDid, SWT.NONE);
		 * btnIssueCredential.setBounds(281, 37, 159, 27);
		 * btnIssueCredential.setText("Issue credential");
		 * 
		 * Button btnRevokeCredential = new Button(shlVisualDid, SWT.NONE);
		 * btnRevokeCredential.setBounds(281, 70, 159, 27);
		 * btnRevokeCredential.setText("Revoke credential");
		 */

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
		btnSelectDid.setText("Create / Select DID");

		/*
		 * btnPublishDid = new Button(shlVisualDid, SWT.NONE);
		 * btnPublishDid.addSelectionListener(new SelectionAdapter() {
		 * 
		 * @Override public void widgetSelected(SelectionEvent e) {
		 * 
		 * PublishDIDJob job = new PublishDIDJob(loadedDID); Thread t = new Thread(job);
		 * t.start();
		 * 
		 * } }); btnPublishDid.setEnabled(false); btnPublishDid.setBounds(281, 136, 159,
		 * 27); btnPublishDid.setText("Publish DID");
		 */

		/*
		 * btnUpdateDid = new Button(shlVisualDid, SWT.NONE);
		 * btnUpdateDid.setEnabled(false); btnUpdateDid.addSelectionListener(new
		 * SelectionAdapter() {
		 * 
		 * @Override public void widgetSelected(SelectionEvent e) {
		 * 
		 * UpdateDIDJob job = new UpdateDIDJob(loadedDID); Thread t = new Thread(job);
		 * t.start();
		 * 
		 * } }); btnUpdateDid.setBounds(281, 169, 159, 27);
		 * btnUpdateDid.setText("Add Issuing key");
		 */

		btnViewDid = new Button(shlVisualDid, SWT.NONE);
		btnViewDid.setEnabled(false);
		btnViewDid.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				openDIDProperyPage();
			}
		});
		btnViewDid.setBounds(281, 136, 159, 27);
		btnViewDid.setText("DID Actions");

		// Combo combo = new Combo(shlVisualDid, SWT.NONE);
		// final ComboViewer combo = new ComboViewer(shlVisualDid, SWT.NONE);

		/*
		 * ComboViewer comboViewer = new ComboViewer(shlVisualDid, SWT.NONE); Combo
		 * combo_1 = comboViewer.getCombo(); combo_1.setBounds(217, 198, 181, 22);
		 * 
		 * //comboViewer.setContentProvider(new
		 * com.elementarysoftware.bip0039.BIP0039SeedPhrases());
		 * //comboViewer.setLabelProvider(new LabelProvider());
		 * comboViewer.setInput(BIP0039SeedPhrases.getBIP0039Phrases());
		 * //comboViewer.getCombo().setText("0");
		 */

	}
}

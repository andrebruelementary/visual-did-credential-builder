package com.elementarysoftware.vdcb;

import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.swt.SWT;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Shell;

import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.jobs.RevokeCredentialJob;
import com.elementarysoftware.prism.jobs.IssueCredentialJob;
import com.elementarysoftware.prism.jobs.UpdateDIDJob;
import com.elementarysoftware.vdcb.tree.CredentialBuilderContentProvider;
import com.elementarysoftware.vdcb.tree.CredentialBuilderLabelProvider;
import com.elementarysoftware.vdcb.tree.DIDDataModelTreeContentProvider;
import com.elementarysoftware.vdcb.tree.DIDDataModelTreeLabelProvider;

import org.eclipse.swt.widgets.Tree;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;

public class DIDCredentialsPage extends Dialog {

	DID did;

	/**
	 * Create the dialog.
	 * 
	 * @param parentShell
	 */
	public DIDCredentialsPage(Shell credentialsShell, DID d) {
		// TODO Auto-generated constructor stub
		super(credentialsShell);
		did = d;
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

		TreeViewer treeViewer = new TreeViewer(container, SWT.BORDER);
		Tree tree = treeViewer.getTree();
		GridData gd_tree = new GridData(SWT.FILL, SWT.FILL, true, true, 1, 4);
		gd_tree.heightHint = 205;
		tree.setLayoutData(gd_tree);
		
		JSONObject obj = new JSONObject();
		obj.put("year", 2021);
		obj.put("degree", "Atala Prism Pioneer");
		JSONArray list = new JSONArray(); 
		list.add("property 1"); 
		list.add("property 2");
		list.add(42);
		obj.put("properties", list);
		
		treeViewer.setContentProvider(new CredentialBuilderContentProvider());
		treeViewer.setLabelProvider(new CredentialBuilderLabelProvider(parent.getDisplay()));
		treeViewer.setInput(obj);
		//treeViewer.refresh();
		

		Button btnIssueCredential = new Button(container, SWT.NONE);
		btnIssueCredential.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				IssueCredentialJob job = new IssueCredentialJob(did);
				Thread t = new Thread(job);
				t.start();
			}
		});
		GridData gd_btnIssueCredential = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnIssueCredential.widthHint = 153;
		btnIssueCredential.setLayoutData(gd_btnIssueCredential);
		btnIssueCredential.setBounds(281, 37, 159, 27);
		btnIssueCredential.setText("Issue credential");

		Button btnRevokeCredential = new Button(container, SWT.NONE);
		btnRevokeCredential.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				RevokeCredentialJob job = new RevokeCredentialJob(did);
				Thread t = new Thread(job);
				t.start();
			}
		});
		GridData gd_btnRevokeCredential = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnRevokeCredential.widthHint = 149;
		btnRevokeCredential.setLayoutData(gd_btnRevokeCredential);
		btnRevokeCredential.setBounds(281, 70, 159, 27);
		btnRevokeCredential.setText("Revoke credential");
		
		Button btnImportCredential = new Button(container, SWT.NONE);
		GridData gd_btnImportCredential = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnImportCredential.widthHint = 151;
		btnImportCredential.setLayoutData(gd_btnImportCredential);
		btnImportCredential.setText("Import credential");
		new Label(container, SWT.NONE);

		return container;
	}

	/**
	 * Create contents of the button bar.
	 * 
	 * @param parent
	 */
	@Override
	protected void createButtonsForButtonBar(Composite parent) {
		createButton(parent, IDialogConstants.OK_ID, IDialogConstants.OK_LABEL, true);
		// createButton(parent, IDialogConstants.CANCEL_ID,
		// IDialogConstants.CANCEL_LABEL, false);
	}

	/**
	 * Return the initial size of the dialog.
	 */
	@Override
	protected Point getInitialSize() {
		return new Point(450, 300);
	}

}

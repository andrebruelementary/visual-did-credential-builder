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
import org.eclipse.swt.widgets.Tree;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.layout.GridData;

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
		tree.setLayoutData(new GridData(SWT.FILL, SWT.FILL, true, true, 1, 3));

		Button btnIssueCredential = new Button(container, SWT.NONE);
		GridData gd_btnIssueCredential = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnIssueCredential.widthHint = 153;
		btnIssueCredential.setLayoutData(gd_btnIssueCredential);
		btnIssueCredential.setBounds(281, 37, 159, 27);
		btnIssueCredential.setText("Issue credential");

		Button btnRevokeCredential = new Button(container, SWT.NONE);
		GridData gd_btnRevokeCredential = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnRevokeCredential.widthHint = 149;
		btnRevokeCredential.setLayoutData(gd_btnRevokeCredential);
		btnRevokeCredential.setBounds(281, 70, 159, 27);
		btnRevokeCredential.setText("Revoke credential");
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

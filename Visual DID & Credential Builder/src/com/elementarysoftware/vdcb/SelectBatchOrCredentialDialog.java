package com.elementarysoftware.vdcb;

import java.util.List;

import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.Tree;

import com.elementarysoftware.prism.Batch;
import com.elementarysoftware.prism.DID;
import com.elementarysoftware.vdcb.tree.BatchCredentialsContentProvider;
import com.elementarysoftware.vdcb.tree.BatchCredentialsLabelProvider;
import com.elementarysoftware.vdcb.tree.CredentialBuilderContentProvider;
import com.elementarysoftware.vdcb.tree.CredentialBuilderLabelProvider;

import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.layout.GridData;

public class SelectBatchOrCredentialDialog extends Dialog {

	private DID did;
	private List selectedForRevocation;
	private TreeViewer treeViewer;
	
	/**
	 * Create the dialog.
	 * @param parentShell
	 * @param did from which to load related credentials and batches
	 */
	public SelectBatchOrCredentialDialog(Shell parentShell, DID d) {
		super(parentShell);
		did = d;
	}

	/**
	 * Create contents of the dialog.
	 * @param parent
	 */
	@Override
	protected Control createDialogArea(Composite parent) {
		Composite container = (Composite) super.createDialogArea(parent);
		
		Label lblCredentialHistory = new Label(container, SWT.NONE);
		lblCredentialHistory.setText("Credential history");
		
		treeViewer = new TreeViewer(container, SWT.BORDER);
		Tree tree = treeViewer.getTree();
		tree.setLayoutData(new GridData(SWT.FILL, SWT.FILL, true, true, 1, 1));
		
		treeViewer.setContentProvider(new BatchCredentialsContentProvider());
		treeViewer.setLabelProvider(new BatchCredentialsLabelProvider(parent.getDisplay()));
			
		treeViewer.setInput(did);
		
		return container;
	}

	public List getSelectedForRevocation() {
		return selectedForRevocation;
	}
	
	@Override
	protected void okPressed() {
		
		if(treeViewer.getSelection().isEmpty()) {
			MessageDialog.openError(getShell(), "No element selected", "No batch or credential was selected for revocation.");
			return;
		}
		selectedForRevocation = treeViewer.getStructuredSelection().toList();
		
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

package com.elementarysoftware.vdcb;

import java.awt.Desktop;
import java.io.File;
import java.io.IOException;

import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.Tree;

import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.jobs.PublishDIDJob;
import com.elementarysoftware.prism.jobs.UpdateDIDJob;
import com.elementarysoftware.vdcb.tree.DIDDataModelTreeContentProvider;
import com.elementarysoftware.vdcb.tree.DIDDataModelTreeLabelProvider;
import com.elementarysoftware.vdcb.tree.PrismKeyTreeObject;

import io.iohk.atala.prism.identity.PrismKeyType;

public class DIDPropertyPage extends Dialog {

	private DID currentDID;

	/**
	 * Create the dialog.
	 * 
	 * @param parentShell
	 */
	public DIDPropertyPage(Shell parentShell, Settings settings) {
		super(parentShell);
		currentDID = (DID) settings.get(Session.CURRENT_DID);
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

		Button btnRevokeKey;

		treeViewer.setContentProvider(new DIDDataModelTreeContentProvider(currentDID));
		treeViewer.setLabelProvider(new DIDDataModelTreeLabelProvider(parent.getDisplay()));
		treeViewer.setInput("did");
		treeViewer.refresh();

		GridData gd_tree = new GridData(SWT.FILL, SWT.FILL, true, false, 1, 4);
		gd_tree.heightHint = 149;
		tree.setLayoutData(gd_tree);

		Button btnPublishDid = new Button(container, SWT.NONE);
		GridData gd_btnPublishDid = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnPublishDid.widthHint = 125;
		btnPublishDid.setLayoutData(gd_btnPublishDid);
		btnPublishDid.setEnabled(false);
		btnPublishDid.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				PublishDIDJob job = new PublishDIDJob(currentDID);
				Thread t = new Thread(job);
				t.start();
			}
		});
		btnPublishDid.setText("Publish DID");

		Button btnAddKeyDid = new Button(container, SWT.NONE);
		GridData gd_btnAddKeyDid = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnAddKeyDid.widthHint = 125;
		btnAddKeyDid.setLayoutData(gd_btnAddKeyDid);
		btnAddKeyDid.setEnabled(false);
		btnAddKeyDid.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				/*
				 * UpdateDIDJob job = new UpdateDIDJob(did); Thread t = new Thread(job);
				 * t.start();
				 */
				openAddKeyDialog();
			}
		});
		btnAddKeyDid.setText("Add key");

		btnRevokeKey = new Button(container, SWT.NONE);
		btnRevokeKey.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {

				Object item = treeViewer.getTree().getSelection()[0].getData();
				if (item instanceof PrismKeyTreeObject) {

					PrismKeyTreeObject to = (PrismKeyTreeObject) item;

					if (to.getType() == PrismKeyType.INSTANCE.getMASTER_KEY()) {
						if (MessageDialog.openConfirm(getParentShell(), "Confirm revokation of MASTER key",
								"You are about to revoke the MASTER key, " + to.getName()
										+ ". This will deactivate your DID and cannot be used after this. The action cannot be undone. Please click \"OK\" to revoke (delete) key "
										+ to.getName())) {

						}

					} else {
						if (MessageDialog.openConfirm(getParentShell(), "Confirm revokation of key",
								"Revoking key cannot be undone. Please confirm that you want to revoke the key "
										+ to.getName())) {
							UpdateDIDJob job = new UpdateDIDJob(currentDID);
							job.keysToRevoke(new String[] { to.getName() });
							Thread t = new Thread(job);
							t.start();
						}
					}
				}

			}
		});
		btnRevokeKey.setEnabled(false);
		GridData gd_btnRevokeKey = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnRevokeKey.widthHint = 125;
		btnRevokeKey.setLayoutData(gd_btnRevokeKey);
		btnRevokeKey.setText("Revoke key");

		Button btnViewLog = new Button(container, SWT.NONE);
		btnViewLog.setEnabled(false);
		btnViewLog.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				openLogViewer();
			}
		});
		GridData gd_btnViewLog = new GridData(SWT.LEFT, SWT.CENTER, false, false, 1, 1);
		gd_btnViewLog.widthHint = 125;
		btnViewLog.setLayoutData(gd_btnViewLog);
		btnViewLog.setText("View log");

		tree.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				if (e.item == null) {
					btnRevokeKey.setEnabled(false);
					return;
				}

				if (e.item.getData() instanceof PrismKeyTreeObject) {
					btnRevokeKey.setEnabled(true);
				} else {
					btnRevokeKey.setEnabled(false);
				}
			}
		});

		/*
		 * final Menu menu = new Menu(tree); tree.setMenu(menu); //ImageRegistry
		 * jfaceImages = JFaceResources.getImageRegistry(); //Image img =
		 * jfaceImages.get(
		 * "platform:/plugin/org.eclipse.egit.ui.source/icons/elcl16/delete.png");
		 * menu.addMenuListener(new MenuAdapter() { public void menuShown(MenuEvent e) {
		 * MenuItem[] items = menu.getItems(); for (int i = 0; i < items.length; i++) {
		 * items[i].dispose(); } MenuItem newItem = new MenuItem(menu, SWT.NONE);
		 * newItem.setText("Menu for " + tree.getSelection()[0].getText());
		 * //newItem.setImage(img); } });
		 */

		if (new File(currentDID.getLogFilePath()).exists()) {
			btnViewLog.setEnabled(true);
		}

		int published_status = currentDID.getStatus();
		if (published_status == DID.STATUS_PUBLISHED) {
			btnAddKeyDid.setEnabled(true);

		} else if (published_status == DID.STATUS_UNPUBLISHED) {
			btnPublishDid.setEnabled(true);
		}

		return container;
	}

	protected void openAddKeyDialog() {
		Shell dialogShell = new Shell();
		AddKeyDialog addDialog = new AddKeyDialog(dialogShell, currentDID);
		addDialog.open();
	}

	protected void openLogViewer() {

		try {
			if (Desktop.isDesktopSupported()) {

				if (new File(currentDID.getLogFilePath()).exists()) {
					// Desktop.getDesktop().edit(new File(did.getLogFilePath()));
					Desktop.getDesktop().open(new File(currentDID.getLogFilePath()));
				} else {
					MessageDialog.openInformation(getParentShell(), "No log file found",
							"There is no log file for this DID. Please run some DID operations and try again");
				}
			} else {

				MessageDialog.openError(getParentShell(), "Not supported on your platform",
						"Unable to view log file on your platform. Please reach out to use to get this sorted");

			}
		} catch (IOException e) {
			e.printStackTrace();
		}

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

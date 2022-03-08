package com.elementarysoftware.vdcb;

import java.io.FileNotFoundException;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.viewers.IStructuredContentProvider;
import org.eclipse.jface.viewers.LabelProvider;
import org.eclipse.jface.viewers.ListViewer;
import org.eclipse.jface.viewers.Viewer;
import org.eclipse.jface.viewers.ViewerSorter;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.graphics.Image;
import org.eclipse.swt.widgets.Button;
import org.eclipse.swt.widgets.Dialog;
import org.eclipse.swt.widgets.Display;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.List;
import org.eclipse.swt.widgets.Shell;

import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.DIDVault;

public class DialogSelectDID extends Dialog {

	protected Object result;
	protected Shell shell;
	protected ListViewer listViewer;

	/**
	 * Create the dialog.
	 * 
	 * @param parent
	 * @param style
	 */
	public DialogSelectDID(Shell parent, int style) {
		super(parent, style);
		setText("DID selector");
	}

	/**
	 * Open the dialog.
	 * 
	 * @return the result
	 */
	public Object open() {
		createContents();
		shell.open();
		shell.layout();
		Display display = getParent().getDisplay();
		while (!shell.isDisposed()) {
			if (!display.readAndDispatch()) {
				display.sleep();
			}
		}
		return result;
	}

	/**
	 * Create contents of the dialog.
	 */
	private void createContents() {
		shell = new Shell(getParent(), getStyle());
		shell.setSize(450, 300);
		shell.setText(getText());

		DIDVault didVault;
		try {
			didVault = new DIDVault();
		} catch (FileNotFoundException e2) {
			// TODO Auto-generated catch block
			e2.printStackTrace();
		}

		Label lblSelectDidTo = new Label(shell, SWT.NONE);
		lblSelectDidTo.setBounds(10, 10, 138, 14);
		lblSelectDidTo.setText("Available DIDs");

		Button btnCreateDid = new Button(shell, SWT.NONE);
		btnCreateDid.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {

				Shell createDIDShell = new Shell();
				CreateNewDIDDialog createDIDDialog = new CreateNewDIDDialog(createDIDShell);
				createDIDDialog.open();

				DID createdDID = createDIDDialog.getCreatedDID();
				if (createdDID != null) {
					listViewer.add(createdDID);
				}

			}
		});
		btnCreateDid.setBounds(274, 14, 138, 27);
		btnCreateDid.setText("Create DID");

		Label label = new Label(shell, SWT.SEPARATOR | SWT.VERTICAL);
		label.setBounds(213, 10, 2, 258);

		Button btnUseSelectedDid = new Button(shell, SWT.NONE);
		btnUseSelectedDid.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {

				DIDVault didVault;
				try {
					didVault = new DIDVault();
					int didIndex = listViewer.getList().getSelectionIndex();

					if (didIndex == -1) {
						MessageDialog.openWarning(shell, "No DID selected", "Please select DID to continue");
					} else {
						// DID did = new DID(listViewer.getList().getSelection()[0],
						// didVault.getDIDSeed(didIndex));
						DID did = (DID) listViewer.getElementAt(didIndex);
						result = did;
						shell.dispose();
					}

				} catch (FileNotFoundException e1) {
					e1.printStackTrace();
				}
			}
		});
		btnUseSelectedDid.setBounds(10, 188, 138, 27);
		btnUseSelectedDid.setText("Use selected DID");

		Button btnImportDid_1 = new Button(shell, SWT.NONE);
		btnImportDid_1.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {

				Shell importDIDShell = new Shell();
				RestoreDIDWithSeedPhraseDialog importDIDDialog = new RestoreDIDWithSeedPhraseDialog(importDIDShell);
				importDIDDialog.open();

				DID restoredDID = importDIDDialog.getRestoredDID();
				if (restoredDID != null) {
					listViewer.add(restoredDID);
				}
			}
		});
		btnImportDid_1.setText("Restore DID");
		btnImportDid_1.setBounds(274, 47, 138, 27);

		listViewer = new ListViewer(shell, SWT.BORDER | SWT.V_SCROLL);
		List availableDIDs = listViewer.getList();
		availableDIDs.setTouchEnabled(true);
		availableDIDs.setBounds(10, 30, 189, 152);
		listViewer.setContentProvider(new IStructuredContentProvider() {
			public Object[] getElements(Object inputElement) {
				DID[] d = (DID[]) inputElement;
				return d;
			}
		});

		DIDVault didVault2;
		try {
			didVault2 = new DIDVault();
			listViewer.setInput(didVault2.getAllDIDs());
		} catch (FileNotFoundException e2) {
			e2.printStackTrace();
		}

		listViewer.setLabelProvider(new LabelProvider() {
			public Image getImage(Object element) {
				return null;
			}

			public String getText(Object element) {
				return ((DID) element).getName();
			}
		});

		listViewer.setSorter(new ViewerSorter() {
			public int compare(Viewer viewer, Object e1, Object e2) {
				return ((DID) e1).getName().compareTo(((DID) e2).getName());
			}
		});

	}
}

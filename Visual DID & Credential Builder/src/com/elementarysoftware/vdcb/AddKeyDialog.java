package com.elementarysoftware.vdcb;

import java.util.List;
import java.util.Vector;

import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.Combo;
import org.eclipse.jface.viewers.ComboViewer;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.widgets.Text;

import com.elementarysoftware.prism.DID;
import com.elementarysoftware.prism.DIDKeyInfo;
import com.elementarysoftware.prism.jobs.UpdateDIDJob;

import io.iohk.atala.prism.identity.PrismDid;
import io.iohk.atala.prism.identity.PrismKeyInformation;
import io.iohk.atala.prism.identity.PrismKeyType;

public class AddKeyDialog extends Dialog {
	private Text textKeyName;
	private Combo comboKeyIndex;
	private Combo comboKeyType;
	private int keyType = -1;
	private int keyIndex = -1;
	private DID did;

	/**
	 * Create the dialog.
	 * 
	 * @param parentShell
	 */
	public AddKeyDialog(Shell parentShell, DID d) {
		super(parentShell);
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
		gridLayout.numColumns = 3;
		new Label(container, SWT.NONE);

		Label lblType = new Label(container, SWT.NONE);
		lblType.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblType.setText("Type");

		ComboViewer comboKeyTypeViewer = new ComboViewer(container, SWT.NONE);
		comboKeyType = comboKeyTypeViewer.getCombo();
		comboKeyType.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
		comboKeyType.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				suggestKeyName();
			}
		});

		List<String> prismKeyTypes = new Vector<String>();

		// PrismKeyType keyType = PrismKeyType.INSTANCE;
		// keyType.getAUTHENTICATION_KEY()
		// prismKeyTypes.add(DIDKeyInfo.KEY_TYPE_AUTHENTICATION);

		// keyType.getISSUING_KEY()
		prismKeyTypes.add(DIDKeyInfo.KEY_TYPE_ISSUING);

		// keyType.getMASTER_KEY()
		prismKeyTypes.add(DIDKeyInfo.KEY_TYPE_MASTER);

		// keyType.getREVOCATION_KEY()
		prismKeyTypes.add(DIDKeyInfo.KEY_TYPE_REVOCATION);

		comboKeyType.setItems(prismKeyTypes.toArray(String[]::new));

		new Label(container, SWT.NONE);

		Label lblIndex = new Label(container, SWT.NONE);
		lblIndex.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblIndex.setText("Index");

		ComboViewer comboKeyIndexViewer = new ComboViewer(container, SWT.NONE);
		comboKeyIndex = comboKeyIndexViewer.getCombo();
		comboKeyIndex.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
		comboKeyIndex.setItems(new String[] { "0", "1", "2", "3", "4", "5" });
		comboKeyIndex.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				suggestKeyName();
			}
		});

		new Label(container, SWT.NONE);

		Label lblName = new Label(container, SWT.NONE);
		lblName.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblName.setText("Name");

		textKeyName = new Text(container, SWT.BORDER);
		textKeyName.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));

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
		createButton(parent, IDialogConstants.CANCEL_ID, IDialogConstants.CANCEL_LABEL, false);
	}

	/**
	 * Return the initial size of the dialog.
	 */
	@Override
	protected Point getInitialSize() {
		return new Point(450, 300);
	}

	private void suggestKeyName() {

		System.out.println("0");
		String defaultKeyName = "";

		if (comboKeyType.getSelectionIndex() == -1)
			return;

		String selectedKeyType = comboKeyType.getItem(comboKeyType.getSelectionIndex());
		/*
		 * if(selectedKeyType.equals(DIDKeyInfo.KEY_TYPE_AUTHENTICATION)) { keyType =
		 * PrismKeyType.INSTANCE.getAUTHENTICATION_KEY(); defaultKeyName = PrismDid.get
		 * } else
		 */if (selectedKeyType.equals(DIDKeyInfo.KEY_TYPE_ISSUING)) {
			keyType = PrismKeyType.INSTANCE.getISSUING_KEY();
			defaultKeyName = PrismDid.getDEFAULT_ISSUING_KEY_ID();
		} else if (selectedKeyType.equals(DIDKeyInfo.KEY_TYPE_MASTER)) {
			keyType = PrismKeyType.INSTANCE.getMASTER_KEY();
			defaultKeyName = PrismDid.getDEFAULT_MASTER_KEY_ID();
		} else if (selectedKeyType.equals(DIDKeyInfo.KEY_TYPE_REVOCATION)) {
			keyType = PrismKeyType.INSTANCE.getREVOCATION_KEY();
			defaultKeyName = PrismDid.getDEFAULT_REVOCATION_KEY_ID();
		}

		System.out.println("1");

		if (keyType == -1 || defaultKeyName.equals("")) {
			System.out.println("keyType: " + keyType + ", defaultKeyName: " + defaultKeyName);
			return;
		}

		System.out.println("2");

		keyIndex = comboKeyIndex.getSelectionIndex();
		if (keyIndex == -1) {
			System.out.println("5");
			comboKeyIndex.select(0);
			keyIndex = 0;
		}

		// > -1 ? comboKeyIndex.getSelectionIndex() : 0;

		System.out.println("3");
		String suggestedKeyName = defaultKeyName.replace("0", comboKeyIndex.getItem(keyIndex));

		System.out.println("4");

		System.out.println("6");

		textKeyName.setText(suggestedKeyName);

		// TODO: IF POSSIBLE, REMOVE ALREADY USED INDEXES FROM THE LIST. CANNOT SEE ANY
		// WAY TO GET KEY INDEX CURRENTLY

		/*
		 * //int availableIndexes
		 * 
		 * // check type of key selected for creation and translate to int type int
		 * keyType = -1;
		 * 
		 * PrismKeyInformation[] keyinfo = did.getDataModel().getPublicKeys(); for(int i
		 * = 0; i < keyinfo.length; i++) { PrismKeyInformation tmpKey = keyinfo[i];
		 * if(tmpKey.getKeyTypeEnum() == keyType) {
		 * //tmpKey.getKeyId().indexOf(selectedKeyType) tmpKey.component3(). } }
		 */
	}

	@Override
	protected void okPressed() {

		// check name has been provided for key
		if (textKeyName.getText().trim().equals("")) {
			MessageDialog.openWarning(getParentShell(), "No key name provided", "Please provide name of key to add");
			return;
		}

		if (keyType == -1) {
			MessageDialog.openWarning(getParentShell(), "No key type selected", "Please select key type");
			return;
		}

		if (keyIndex == -1) {
			MessageDialog.openWarning(getParentShell(), "No key index selected", "Please select key index");
			return;
		}

		// check that the added key doesn't exist already
		PrismKeyInformation[] keyinfo = did.getDataModel().getPublicKeys();
		for (int i = 0; i < keyinfo.length; i++) {
			PrismKeyInformation tmpKey = keyinfo[i];
			if (tmpKey.getKeyId().toLowerCase().equals(textKeyName.getText().toLowerCase().trim())) {
				MessageDialog.openWarning(getParentShell(), "Duplicate key name",
						"Key with name " + textKeyName.getText() + " already exist. Please select unique name");
				return;
			}
		}

		// if this point is reached, quality check is successful. Create key
		UpdateDIDJob job = new UpdateDIDJob(did);
		job.keyToAdd(new DIDKeyInfo[] { new DIDKeyInfo(textKeyName.getText().trim(), keyType, keyIndex) });
		Thread t = new Thread(job);
		t.start();

		super.okPressed();
	}

}
